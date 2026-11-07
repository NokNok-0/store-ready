/**
 * Opt-in network check for --verify-urls. Off by default: the checker stays offline unless asked.
 * The URLs come from the checked project, which may not be trusted (CI on pull requests), so only public
 * hosts are contacted: every hop is resolved and refused if any address is loopback, private, link-local
 * or otherwise non-public. Redirects are followed by hand with a hop limit. Only the status code is read.
 */

import { lookup as dnsLookup } from 'node:dns';
import { lookup } from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import { BlockList, isIP } from 'node:net';

export const VERIFY_TIMEOUT_MS = 10_000;
export const MAX_REDIRECTS = 5;
export const MAX_URLS = 20;

const NON_PUBLIC = new BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
]) NON_PUBLIC.addSubnet(String(network), Number(prefix), 'ipv4');
const GLOBAL_UNICAST_V6 = new BlockList();
GLOBAL_UNICAST_V6.addSubnet('2000::', 3, 'ipv6');
const SPECIAL_V6 = new BlockList();
for (const [network, prefix] of [['2001::', 23], ['2001:db8::', 32], ['2002::', 16], ['3fff::', 20]]) {
  SPECIAL_V6.addSubnet(String(network), Number(prefix), 'ipv6');
}

/** Only global unicast addresses count as public; IPv4-mapped addresses are judged by their IPv4 part. @param {string} address */
export function isPublicAddress(address) {
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return isPublicAddress(mapped[1]);
  const family = isIP(address);
  if (family === 4) return !NON_PUBLIC.check(address, 'ipv4');
  if (family === 6) return GLOBAL_UNICAST_V6.check(address, 'ipv6') && !SPECIAL_V6.check(address, 'ipv6');
  return false;
}

/**
 * A DNS lookup for http(s).request that refuses non-public addresses at connect time, so a name that
 * changes its answer between the pre-check and the connection cannot reach an internal host.
 * @param {boolean} allowPrivateHosts
 */
function guardedLookup(allowPrivateHosts) {
  /** @type {import('node:net').LookupFunction} */
  return (hostname, options, callback) => {
    dnsLookup(hostname, { ...options, all: true, verbatim: true }, (error, addresses) => {
      if (error) return callback(error, '', 4);
      const list = /** @type {import('node:dns').LookupAddress[]} */ (addresses);
      const allowed = allowPrivateHosts ? list : list.filter((entry) => isPublicAddress(entry.address));
      if (allowed.length === 0 || allowed.length !== list.length) {
        return callback(Object.assign(new Error('host is not a public address'), { code: 'ENOTPUBLIC' }), '', 4);
      }
      if (options.all) return callback(null, allowed);
      return callback(null, allowed[0].address, allowed[0].family);
    });
  };
}

/**
 * @param {URL} url @param {'HEAD' | 'GET'} method @param {AbortSignal} signal @param {boolean} allowPrivateHosts
 * @returns {Promise<{ status: number, location: string | null }>}
 */
function nodeRequest(url, method, signal, allowPrivateHosts) {
  return new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http;
    const request = client.request(url, {
      method,
      signal,
      lookup: guardedLookup(allowPrivateHosts),
      headers: { 'user-agent': 'store-ready (--verify-urls)' },
    }, (response) => {
      response.resume();
      const location = response.headers.location;
      resolve({ status: response.statusCode ?? 0, location: typeof location === 'string' ? location : null });
    });
    request.on('error', reject);
    request.end();
  });
}

/**
 * @param {typeof fetch} fetchImpl @param {URL} url @param {'HEAD' | 'GET'} method @param {AbortSignal} signal
 * @returns {Promise<{ status: number, location: string | null }>}
 */
async function fetchRequest(fetchImpl, url, method, signal) {
  const response = await fetchImpl(url, { method, redirect: 'manual', signal, headers: { 'user-agent': 'store-ready (--verify-urls)' } });
  try {
    await response.body?.cancel();
  } catch {
    // the body is not needed
  }
  return { status: response.status, location: response.headers.get('location') };
}

/** @param {string} hostname @param {typeof lookup} resolve */
async function hostIsPublic(hostname, resolve) {
  const host = hostname.replace(/^\[|\]$/g, '');
  if (isIP(host)) return isPublicAddress(host);
  if (/^localhost$/i.test(host) || /\.localhost$/i.test(host)) return false;
  const addresses = await resolve(host, { all: true, verbatim: true });
  return addresses.length > 0 && addresses.every((entry) => isPublicAddress(entry.address));
}

/** @param {number} status */
const isOk = (status) => status >= 200 && status < 300;
/** @param {number} status */
const isRedirect = (status) => status >= 300 && status < 400;

/**
 * @typedef {{ fetchImpl?: typeof fetch, timeoutMs?: number, allowPrivateHosts?: boolean, resolve?: typeof lookup }} VerifyOptions
 */

/**
 * @param {string} url
 * @param {VerifyOptions} [options]
 * @returns {Promise<import('./project/links.js').UrlCheck>}
 */
export async function verifyUrl(url, { fetchImpl, timeoutMs = VERIFY_TIMEOUT_MS, allowPrivateHosts = false, resolve = lookup } = {}) {
  if (!/^https?:\/\//i.test(url)) return { ok: false, error: 'not an http(s) URL' };
  const signal = AbortSignal.timeout(timeoutMs);
  /** @param {URL} target @param {'HEAD' | 'GET'} method */
  const send = (target, method) => (fetchImpl ? fetchRequest(fetchImpl, target, method, signal) : nodeRequest(target, method, signal, allowPrivateHosts));

  /** @param {'HEAD' | 'GET'} method */
  const follow = async (method) => {
    let current = new URL(url);
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (!/^https?:$/.test(current.protocol)) return { error: 'redirected to a non-http(s) URL' };
      if (!allowPrivateHosts && !(await hostIsPublic(current.hostname, resolve))) {
        return { error: 'not contacted: the host is not a public address' };
      }
      const { status, location } = await send(current, method);
      if (!isRedirect(status) || !location) return { status };
      current = new URL(location, current);
    }
    return { error: `more than ${MAX_REDIRECTS} redirects` };
  };

  try {
    const head = await follow('HEAD');
    if ('error' in head) return { ok: false, error: head.error };
    if (isOk(head.status)) return { ok: true, status: head.status };
  } catch {
    // some servers drop HEAD requests; try GET
  }
  try {
    const get = await follow('GET');
    if ('error' in get) return { ok: false, error: get.error };
    return isOk(get.status) ? { ok: true, status: get.status } : { ok: false, status: get.status };
  } catch (error) {
    return { ok: false, error: describeError(error, timeoutMs) };
  }
}

/** A short reason that never includes response bodies. @param {unknown} error @param {number} timeoutMs */
function describeError(error, timeoutMs) {
  const name = error instanceof Error ? error.name : '';
  if (name === 'TimeoutError' || name === 'AbortError') return `no response within ${Math.round(timeoutMs / 100) / 10} s`;
  const cause = error instanceof Error && error.cause && typeof error.cause === 'object' ? /** @type {{ code?: unknown }} */ (error.cause).code : undefined;
  if (typeof cause === 'string' && /^[A-Z_]+$/.test(cause)) return `network error ${cause}`;
  const code = error && typeof error === 'object' ? /** @type {{ code?: unknown }} */ (error).code : undefined;
  if (code === 'ENOTPUBLIC') return 'not contacted: the host is not a public address';
  return typeof code === 'string' && /^[A-Z_]+$/.test(code) ? `network error ${code}` : 'network error';
}

/**
 * @param {string[]} urls
 * @param {VerifyOptions} [options]
 * @returns {Promise<Map<string, import('./project/links.js').UrlCheck>>}
 */
export async function verifyUrls(urls, options) {
  const unique = [...new Set(urls)];
  const checked = unique.slice(0, MAX_URLS);
  const results = await Promise.all(checked.map((url) => verifyUrl(url, options)));
  const map = new Map(checked.map((url, index) => [url, results[index]]));
  for (const url of unique.slice(MAX_URLS)) map.set(url, { ok: false, error: `not contacted: only the first ${MAX_URLS} URLs are checked` });
  return map;
}
