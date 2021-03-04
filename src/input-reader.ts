export class InputReader {
  done: boolean;
  input: string;
  length: number;
  matches: string[];
  position: number;
  
  constructor(input: string) {
    this.done = false;
    this.input = input;
    this.length = input.length;
    this.matches = [];
    this.position = 0;
  }

  addMatch(match: string): void {
    this.input = this.input.slice(match.length);
    this.matches.push(match);
    this.position += match.length;
    this.done = (this.position >= this.length);
  }

  ch(): string {
    const ch = this.input[0];
    this.addMatch(ch);
    return ch;
  }

  unCh(chLength: number, ch: string): void {
    this.position -= chLength;
    this.position = Math.max(0, this.position);
    this.input = ch + this.input;
    this.done = (this.position >= this.length);
  }

  substring(start: number, end: number): string {
    start = (start !== 0 ? this.position + start : this.position);
    end = (end !== 0 ? start + end : this.length);
    return this.input.substring(start, end);
  }

  match(rule): RegExpMatchArray | null {
    let match,
      input = this.input;

    if ((match = input.match(rule)) !== null) {
      return match;
    }

    return null;
  }

  toString(): string {
    return this.matches.join('');
  }
}
