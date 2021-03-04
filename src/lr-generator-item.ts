import { Production } from './production';

export class LRGeneratorItem {
  production: Production;
  id: string | number;
  dotPosition: number;
  follows: (number | string)[];
  predecessor: number;
  markedSymbol: string;

  constructor(production: Production, dot: number = 0, f: (number | string)[] = [], predecessor?: number) {
    this.production = production;
    this.dotPosition = dot;
    this.follows = f;
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
    const handle = this.production.handle.slice(0);
    handle[this.dotPosition] = '.' + (handle[this.dotPosition] || '');
    return handle.join(' ');
  }

  toString() {
    const temp = this.production.handle.slice(0);
    temp[this.dotPosition] = '.' + (temp[this.dotPosition] || '');
    return this.production.symbol + " -> " + temp.join(' ') +
        (this.follows.length === 0 ? "" : " #lookAheads= " + this.follows.join(' '));
  }
}
