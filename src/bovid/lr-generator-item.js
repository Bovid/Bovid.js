export default class LRGeneratorItem {
  constructor(production, dot, f, predecessor) {
    this.production = production;
    this.dotPosition = dot || 0;
    this.follows = f || [];
    this.predecessor = predecessor;
    this.id = parseInt(production.id + 'a' + this.dotPosition, 36);
    this.markedSymbol = this.production.handle[this.dotPosition];
  }

  remainingHandle() {
    return this.production.handle.slice(this.dotPosition + 1);
  }

  eq(e) {
    return e.id === this.id;
  }

  handleToString() {
    var handle = this.production.handle.slice(0);
    handle[this.dotPosition] = '.' + (handle[this.dotPosition] || '');
    return handle.join(' ');
  }

  toString() {
    var temp = this.production.handle.slice(0);
    temp[this.dotPosition] = '.' + (temp[this.dotPosition] || '');
    return this.production.symbol + " -> " + temp.join(' ') +
        (this.follows.length === 0 ? "" : " #lookaheads= " + this.follows.join(' '));
  }
}
