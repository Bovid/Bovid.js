import InputReader from './input-reader';

/**
 * An input reader for parser/lexer, uses sticky behavior
 * @param {String} input
 */
class StickyInputReader extends InputReader {

  constructor() {
    super();

    let rules = lexer.rules;

    for (let i = 0; i < rules.length; i++) {
      rule = rules[i];
      rules[i] = new RegExp(rule.source.substring(1), 'y');
    }
  }

  addMatch(match) {
    this.matches.push(match);
    this.position += match.length;
    this.done = (this.position >= this.length);
  }

  ch() {
    const ch = this.input[this.position];
    this.addMatch(ch);
    return ch;
  }

  match(rule) {
    const match = rule.exec(this.input);
    rule.lastIndex = this.position;
    if (match !== null) {
      return match;
    }
    return null;
  }

  substring(start, end) {
    start = (start != 0 ? this.position + start : this.position);
    end = (end != 0 ? start + end : this.length);
    return this.input.substring(start, end);
  }

  toString() {
    return this.matches.join('');
  }

  unCh(chLength) {
    this.position -= chLength;
    this.position = Math.max(0, this.position);
    this.done = (this.position >= this.length);
  }
}