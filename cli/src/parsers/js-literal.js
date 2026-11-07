import { isScalarValue } from './plist.js';

/**
 * @typedef {{ ok: true, value: unknown } | { ok: false, reason: string }} StaticReadResult
 */

class NotLiteral extends Error {}

const IDENTIFIER = /[A-Za-z_$][\w$]*/y;
const NUMBER = /-?(?:0[xX][0-9a-fA-F]+|(?:\d[\d_]*)?\.?\d[\d_]*(?:[eE][+-]?\d+)?)/y;

/**
 * @param {string} source app.config.js / app.config.ts source; never executed
 * @returns {StaticReadResult}
 */
export function readStaticConfig(source) {
  const masked = maskComments(source);
  try {
    const start = findExportedObject(masked);
    const parser = new LiteralParser(masked, start);
    return { ok: true, value: parser.parseValue() };
  } catch (error) {
    return { ok: false, reason: error instanceof NotLiteral ? error.message : 'it could not be parsed' };
  }
}

/** @param {string} source */
export function maskComments(source) {
  let out = '';
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    const two = source.slice(i, i + 2);
    if (ch === '"' || ch === "'" || ch === '`') {
      const end = skipString(source, i);
      out += source.slice(i, end);
      i = end;
    } else if (two === '//') {
      const end = source.indexOf('\n', i);
      const stop = end === -1 ? source.length : end;
      out += ' '.repeat(stop - i);
      i = stop;
    } else if (two === '/*') {
      const end = source.indexOf('*/', i + 2);
      const stop = end === -1 ? source.length : end + 2;
      out += source.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop;
    } else {
      out += ch;
      i += 1;
    }
  }
  return out;
}

/** @param {string} source @param {number} start */
function skipString(source, start) {
  const quote = source[start];
  let i = start + 1;
  while (i < source.length) {
    if (source[i] === '\\') i += 2;
    else if (source[i] === quote) return i + 1;
    else if (quote !== '`' && source[i] === '\n') return i;
    else i += 1;
  }
  return i;
}

/** @param {string} source */
function findExportedObject(source) {
  const exportMatch = /(?:^|[\s;])(?:module\.exports\s*=|export\s+default)\s*/m.exec(source);
  if (!exportMatch) throw new NotLiteral('no default export found');
  let index = exportMatch.index + exportMatch[0].length;
  if (source[index] === '{') return index;
  IDENTIFIER.lastIndex = index;
  const identifier = IDENTIFIER.exec(source);
  if (!identifier || ['function', 'async', 'class', 'new'].includes(identifier[0])) {
    throw new NotLiteral('the default export is a function or expression');
  }
  const name = identifier[0];
  index += name.length;
  const rest = source.slice(index).trimStart();
  if (rest.startsWith('(') || rest.startsWith('=>') || rest.startsWith('.')) {
    throw new NotLiteral('the default export is a function or expression');
  }
  const declaration = new RegExp(`\\b(?:const|let|var)\\s+${escapeRegExp(name)}\\s*(?::[^=]+)?=\\s*`).exec(source);
  if (!declaration) throw new NotLiteral('the exported name is not declared as an object literal in this file');
  const objectStart = declaration.index + declaration[0].length;
  if (source[objectStart] !== '{') throw new NotLiteral('the exported name is not an object literal');
  const mutation = new RegExp(`\\b${escapeRegExp(name)}\\s*(?:\\.[\\w$]+|\\[[^\\]]*\\])+\\s*=(?!=)|Object\\.assign\\(\\s*${escapeRegExp(name)}\\b`);
  if (mutation.test(source)) throw new NotLiteral('the exported object is changed after it is declared');
  return objectStart;
}

/** @param {string} text */
function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

class LiteralParser {
  /** @param {string} source @param {number} index */
  constructor(source, index) {
    this.source = source;
    this.index = index;
  }

  skipSpace() {
    while (this.index < this.source.length && /\s/.test(this.source[this.index])) this.index += 1;
  }

  peek() {
    this.skipSpace();
    return this.source[this.index];
  }

  /** @param {string} ch */
  expect(ch) {
    if (this.peek() !== ch) this.fail(`expected "${ch}"`);
    this.index += 1;
  }

  /** @param {string} message @returns {never} */
  fail(message) {
    const before = this.source.slice(0, this.index).split('\n');
    throw new NotLiteral(`${message} at line ${before.length}, column ${before[before.length - 1].length + 1}`);
  }

  /** @returns {unknown} */
  parseValue() {
    const ch = this.peek();
    if (ch === '{') return this.parseObject();
    if (ch === '[') return this.parseArray();
    if (ch === '"' || ch === "'" || ch === '`') return this.parseString();
    if (ch !== undefined && /[-\d.]/.test(ch)) return this.parseNumber();
    IDENTIFIER.lastIndex = this.index;
    const identifier = IDENTIFIER.exec(this.source);
    if (identifier) {
      const word = identifier[0];
      if (word === 'true' || word === 'false' || word === 'null' || word === 'undefined') {
        this.index += word.length;
        if (/^\s*[.(\[?]/.test(this.source.slice(this.index, this.index + 3)) && word !== 'undefined') this.fail('uses an expression');
        return word === 'true' ? true : word === 'false' ? false : word === 'null' ? null : undefined;
      }
      this.fail('uses a non-literal value');
    }
    this.fail('uses a non-literal value');
  }

  parseObject() {
    this.expect('{');
    /** @type {Record<string, unknown>} */
    const object = {};
    for (;;) {
      const ch = this.peek();
      if (ch === '}') {
        this.index += 1;
        return object;
      }
      if (this.source.startsWith('...', this.index)) this.fail('uses a spread');
      if (ch === '[') this.fail('uses a computed key');
      const key = this.parseKey();
      if (this.peek() !== ':') this.fail('uses a shorthand property or a method');
      this.index += 1;
      const value = this.parseValue();
      if (value !== undefined) {
        Object.defineProperty(object, key, { value, enumerable: true, writable: true, configurable: true });
      }
      this.separator('}');
    }
  }

  parseArray() {
    this.expect('[');
    const items = [];
    for (;;) {
      if (this.peek() === ']') {
        this.index += 1;
        return items;
      }
      if (this.source.startsWith('...', this.index)) this.fail('uses a spread');
      items.push(this.parseValue());
      this.separator(']');
    }
  }

  /** @param {string} close */
  separator(close) {
    const ch = this.peek();
    if (ch === ',') {
      this.index += 1;
      return;
    }
    if (ch !== close) this.fail(`expected "," or "${close}"`);
  }

  parseKey() {
    const ch = this.peek();
    if (ch === '"' || ch === "'") return this.parseString();
    IDENTIFIER.lastIndex = this.index;
    const identifier = IDENTIFIER.exec(this.source);
    if (identifier) {
      this.index += identifier[0].length;
      return identifier[0];
    }
    if (ch !== undefined && /\d/.test(ch)) return String(this.parseNumber());
    this.fail('expected a property name');
  }

  parseString() {
    const quote = this.source[this.index];
    let value = '';
    let i = this.index + 1;
    while (i < this.source.length) {
      const ch = this.source[i];
      if (ch === quote) {
        this.index = i + 1;
        return value;
      }
      if (quote === '`' && ch === '$' && this.source[i + 1] === '{') {
        this.index = i;
        this.fail('uses a template expression');
      }
      if (quote !== '`' && ch === '\n') break;
      if (ch === '\\') {
        const [text, length] = readEscape(this.source, i + 1);
        value += text;
        i += 1 + length;
        continue;
      }
      value += ch;
      i += 1;
    }
    this.fail('has an unterminated string');
  }

  parseNumber() {
    NUMBER.lastIndex = this.index;
    const match = NUMBER.exec(this.source);
    if (!match || match[0] === '-' || match[0] === '.') this.fail('uses a non-literal value');
    this.index += match[0].length;
    if (/^[\w$]/.test(this.source[this.index] ?? '')) this.fail('uses a non-literal value');
    return Number(match[0].replace(/_/g, ''));
  }
}

/** @param {string} digits @param {number} length exact length, or 0 for 1-6 digits */
function hexValue(digits, length) {
  const valid = length === 0 ? /^[0-9a-fA-F]{1,6}$/ : new RegExp(`^[0-9a-fA-F]{${length}}$`);
  if (!valid.test(digits)) throw new NotLiteral('has an invalid escape sequence');
  return parseInt(digits, 16);
}

const SIMPLE_ESCAPES = /** @type {Record<string, string>} */ ({ n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', 0: '\0' });

/** @param {string} source @param {number} i @returns {[string, number]} */
function readEscape(source, i) {
  const ch = source[i];
  if (ch in SIMPLE_ESCAPES) return [SIMPLE_ESCAPES[ch], 1];
  if (ch === '\r' && source[i + 1] === '\n') return ['', 2];
  if (ch === '\n') return ['', 1];
  if (ch === 'x') return [String.fromCharCode(hexValue(source.slice(i + 1, i + 3), 2)), 3];
  if (ch === 'u') {
    if (source[i + 1] === '{') {
      const end = source.indexOf('}', i);
      const code = end === -1 ? NaN : hexValue(source.slice(i + 2, end), 0);
      if (!isScalarValue(code)) throw new NotLiteral('has an invalid unicode escape');
      return [String.fromCodePoint(code), end - i + 1];
    }
    return [String.fromCharCode(hexValue(source.slice(i + 1, i + 5), 4)), 5];
  }
  return [ch ?? '', 1];
}
