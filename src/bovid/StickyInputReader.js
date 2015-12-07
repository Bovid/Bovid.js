/**
 * in input reader for parser/lexer, uses sticky behavior
 * @param {String} input
 */
class StickyInputReader extends InputReader {

  constructor() {
    super();
    rules = lexer.rules;
    max = rules.length;
    i = 0;
    for (; i < max; i++) {
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
    var ch = this.input[this.position];
    this.addMatch(ch);
    return ch;
  }

  unCh(chLength) {
    this.position -= chLength;
    this.position = Math.max(0, this.position);
    this.done = (this.position >= this.length);
  }

  substring(start, end) {
    start = (start != 0 ? this.position + start : this.position);
    end = (end != 0 ? start + end : this.length);
    return this.input.substring(start, end);
  }

  match(rule) {
    var match;
    rule.lastIndex = this.position;
    if ((match = rule.exec(this.input)) !== null) {
      return match;
    }
    return null;
  }

  toString() {
    return this.matches.join('');
  }
}