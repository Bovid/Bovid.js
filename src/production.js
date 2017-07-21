export default class Production {
  constructor(symbol, handle, id) {
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