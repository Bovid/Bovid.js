class InputReader {

  var stickyCompatible = RegExp.prototype.sticky !== undefined,
    rules,
    rule,
    max,
    i;

  constructor(input) {
    this.done = false;
    this.input = input;
    this.length = input.length;
    this.matches = [];
    this.position = 0;
  }

  addMatch(match) {
    this.input = this.input.slice(match.length);
    this.matches.push(match);
    this.position += match.length;
    this.done = (this.position >= this.length);
  }

  ch() {
    var ch = this.input[0];
    this.addMatch(ch);
    return ch;
  }

  unCh(chLength, ch) {
    this.position -= chLength;
    this.position = Math.max(0, this.position);
    this.input = ch + this.input;
    this.done = (this.position >= this.length);
  }

  substring(start, end) {
    start = (start != 0 ? this.position + start : this.position);
    end = (end != 0 ? start + end : this.length);
    return this.input.substring(start, end);
  }

  match(rule) {
    var match,
      input = this.input;

    if ((match = input.match(rule)) !== null) {
      return match;
    }

    return null;
  }

  toString() {
    return this.matches.join('');
  }
}