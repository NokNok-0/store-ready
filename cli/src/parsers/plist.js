/**
 * @typedef {{ type: 'open' | 'close' | 'empty', name: string } | { type: 'text', value: string }} Token
 */

const ENTITIES = /** @type {Record<string, string>} */ ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" });

export class PlistError extends Error {}

/** @param {string} text */
export function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (match, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return isScalarValue(code) ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[body] ?? match;
  });
}

/** @param {number} code */
export function isScalarValue(code) {
  return Number.isInteger(code) && code >= 0 && code <= 0x10ffff && (code < 0xd800 || code > 0xdfff);
}

/**
 * Parses an XML property list (Info.plist, PrivacyInfo.xcprivacy). Binary plists are rejected.
 * @param {string} text
 * @returns {unknown}
 */
export function parsePlist(text) {
  if (text.startsWith('bplist')) throw new PlistError('binary plists are not supported; convert with "plutil -convert xml1"');
  const tokens = tokenize(text);
  let position = 0;

  const next = () => {
    while (position < tokens.length) {
      const token = tokens[position++];
      if (token.type !== 'text' || token.value.trim() !== '') return token;
    }
    return null;
  };

  /** @param {string} name */
  const readText = (name) => {
    let value = '';
    while (position < tokens.length) {
      const token = tokens[position++];
      if (token.type === 'text') value += token.value;
      else if (token.type === 'close' && token.name === name) return value;
      else throw new PlistError(`unexpected <${token.name}> inside <${name}>`);
    }
    throw new PlistError(`unclosed <${name}>`);
  };

  /** @param {Token | null} token @returns {unknown} */
  const parseValue = (token) => {
    if (!token) throw new PlistError('unexpected end of document');
    if (token.type === 'text') throw new PlistError(`unexpected text "${token.value.trim().slice(0, 20)}"`);
    if (token.type === 'close') throw new PlistError(`unexpected </${token.name}>`);
    const { name } = token;
    if (token.type === 'empty') {
      switch (name) {
        case 'true': return true;
        case 'false': return false;
        case 'string': return '';
        case 'dict': return {};
        case 'array': return [];
        case 'data': return Buffer.alloc(0);
        default: throw new PlistError(`empty <${name}/> is not a valid value`);
      }
    }
    switch (name) {
      case 'string':
      case 'date':
        return readText(name);
      case 'integer': {
        const raw = readText(name).trim();
        if (!/^[+-]?(\d+|0x[0-9a-fA-F]+)$/.test(raw)) throw new PlistError(`invalid integer "${raw}"`);
        return Number(raw.replace(/^\+/, ''));
      }
      case 'real': {
        const value = Number(readText(name).trim());
        if (Number.isNaN(value)) throw new PlistError('invalid real');
        return value;
      }
      case 'data':
        return Buffer.from(readText(name).replace(/\s+/g, ''), 'base64');
      case 'true':
      case 'false': {
        const close = next();
        if (!close || close.type !== 'close' || close.name !== name) throw new PlistError(`unclosed <${name}>`);
        return name === 'true';
      }
      case 'array': {
        const items = [];
        for (;;) {
          const item = next();
          if (item && item.type === 'close' && item.name === 'array') return items;
          items.push(parseValue(item));
        }
      }
      case 'dict': {
        /** @type {Record<string, unknown>} */
        const dict = {};
        for (;;) {
          const keyToken = next();
          if (keyToken && keyToken.type === 'close' && keyToken.name === 'dict') return dict;
          if (!keyToken || keyToken.type !== 'open' || keyToken.name !== 'key') {
            throw new PlistError('expected <key> inside <dict>');
          }
          const key = readText('key');
          const value = parseValue(next());
          Object.defineProperty(dict, key, { value, enumerable: true, writable: true, configurable: true });
        }
      }
      default:
        throw new PlistError(`unknown element <${name}>`);
    }
  };

  const first = next();
  if (first && first.type === 'open' && first.name === 'plist') {
    const value = parseValue(next());
    const close = next();
    if (!close || close.type !== 'close' || close.name !== 'plist') throw new PlistError('expected </plist>');
    return value;
  }
  if (first && first.type === 'empty' && first.name === 'plist') return undefined;
  return parseValue(first);
}

/** @param {string} xml @returns {Token[]} */
function tokenize(xml) {
  /** @type {Token[]} */
  const tokens = [];
  let i = 0;
  /** @param {string} marker @param {number} from */
  const after = (marker, from) => {
    const end = xml.indexOf(marker, from);
    if (end === -1) throw new PlistError(`unterminated markup, expected "${marker}"`);
    return end + marker.length;
  };
  while (i < xml.length) {
    const lt = xml.indexOf('<', i);
    if (lt === -1) {
      tokens.push({ type: 'text', value: decodeEntities(xml.slice(i)) });
      break;
    }
    if (lt > i) tokens.push({ type: 'text', value: decodeEntities(xml.slice(i, lt)) });
    if (xml.startsWith('<!--', lt)) {
      i = after('-->', lt + 4);
    } else if (xml.startsWith('<![CDATA[', lt)) {
      const end = after(']]>', lt + 9);
      tokens.push({ type: 'text', value: xml.slice(lt + 9, end - 3) });
      i = end;
    } else if (xml.startsWith('<?', lt)) {
      i = after('?>', lt + 2);
    } else if (xml.startsWith('<!', lt)) {
      i = after('>', lt + 2);
    } else {
      const gt = after('>', lt + 1);
      const inner = xml.slice(lt + 1, gt - 1).trim();
      if (inner.startsWith('/')) {
        tokens.push({ type: 'close', name: inner.slice(1).trim() });
      } else if (inner.endsWith('/')) {
        tokens.push({ type: 'empty', name: inner.slice(0, -1).trim().split(/\s/)[0] });
      } else {
        tokens.push({ type: 'open', name: inner.split(/\s/)[0] });
      }
      i = gt;
    }
  }
  return tokens;
}
