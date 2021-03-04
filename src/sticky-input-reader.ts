import { InputReader } from './input-reader';
/**
 * An input reader for parser/lexer, uses sticky behavior
 */
export class StickyInputReader extends InputReader {
  addMatch(match: string): void {
    this.matches.push(match);
    this.position += match.length;
    this.done = (this.position >= this.length);
  }

  ch(): string {
    const ch = this.input[this.position];
    this.addMatch(ch);
    return ch;
  }

  match(rule: RegExp): RegExpExecArray | null {
    const match = rule.exec(this.input);
    rule.lastIndex = this.position;
    if (match !== null) {
      return match;
    }
    return null;
  }

  substring(start = 0, end = 0): string {
    start = (start != 0 ? this.position + start : this.position);
    end = (end != 0 ? start + end : this.length);
    return this.input.substring(start, end);
  }

  toString(): string {
    return this.matches.join('');
  }

  unCh(chLength: number): void {
    this.position -= chLength;
    this.position = Math.max(0, this.position);
    this.done = (this.position >= this.length);
  }
}