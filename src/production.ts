export class Production {
  symbol: string;
  handle: string;
  id: number;
  nullable: boolean;
  first: number[];
  precedence: number;

  constructor(symbol: string, handle: string, id: number) {
    this.symbol = symbol;
    this.handle = handle;
    this.nullable = false;
    this.id = id;
    this.first = [];
    this.precedence = 0;
  }

  toString() {
    return `${this.symbol} -> ${this.handle.join(' ')}`;
  }
}