/**
 * Opt-in network check for --verify-urls. Off by default: the checker stays offline unless asked.
 * Sends HEAD, falls back to GET when HEAD fails or is refused, follows redirects, and reports the final status.
 */

export const VERIFY_TIMEOUT_MS = 10_000;

/** @param {number} status */
const isOk = (status) => status >= 200 && status < 400;

/**
 * @param {string} url
 * @param {{ fetchImpl?: typeof fetch, timeoutMs?: number }} [options]
 * @returns {Promise<import('./project/links.js').UrlCheck>}
 */
export async function verifyUrl(url, { fetchImpl = globalThis.fetch, timeoutMs = VERIFY_TIMEOUT_MS } = {}) {
  if (!/^https?:\/\//i.test(url)) return { ok: false, error: 'not an http(s) URL' };
  if (typeof fetchImpl !== 'function') return { ok: false, error: 'this Node.js has no fetch' };
  /** @param {'HEAD' | 'GET'} method */
  const request = async (method) => {
    const response = await fetchImpl(url, {
      method,
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'user-agent': 'store-ready (--verify-urls)' },
    });
    try {
      await response.body?.cancel();
    } catch {
      // the body is not needed
    }
    return response.status;
  };
  try {
    const status = await request('HEAD');
    if (isOk(status)) return { ok: true, status };
  } catch {
    // some servers drop HEAD requests; try GET
  }
  try {
    const status = await request('GET');
    return isOk(status) ? { ok: true, status } : { ok: false, status };
  } catch (error) {
    return { ok: false, error: describeError(error, timeoutMs) };
  }
}

/** A short reason that never includes response bodies. @param {unknown} error @param {number} timeoutMs */
function describeError(error, timeoutMs) {
  const name = error instanceof Error ? error.name : '';
  if (name === 'TimeoutError' || name === 'AbortError') return `no response within ${Math.round(timeoutMs / 100) / 10} s`;
  const cause = error instanceof Error && error.cause && typeof error.cause === 'object' ? /** @type {{ code?: unknown }} */ (error.cause).code : undefined;
  return typeof cause === 'string' && /^[A-Z_]+$/.test(cause) ? `network error ${cause}` : 'network error';
}

/**
 * @param {string[]} urls
 * @param {{ fetchImpl?: typeof fetch, timeoutMs?: number }} [options]
 * @returns {Promise<Map<string, import('./project/links.js').UrlCheck>>}
 */
export async function verifyUrls(urls, options) {
  const unique = [...new Set(urls)];
  const results = await Promise.all(unique.map((url) => verifyUrl(url, options)));
  return new Map(unique.map((url, index) => [url, results[index]]));
}
