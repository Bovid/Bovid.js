import { LRGeneratorItem } from './lr-generator-item';
import { LRGeneratorCollection } from './lr-generator-collection';

export interface IHash {
  [id: string]: boolean;
}

export interface IHashArray {
  [id: string]: string[];
}

export class LRGeneratorItemSet<T extends LRGeneratorItem = LRGeneratorItem> {
  predecessors: { [symbol: string]: LRGeneratorItemSet<T> } = {};
  reductions: LRGeneratorItem[];
  goes: IHashArray;
  edges: { [symbol: string]: LRGeneratorCollection } = {};
  shifts: boolean;
  inadequate: boolean;
  hash_: IHash;
  _items: T[];

  constructor(items: T[] = []) {
    this._items = items;
    this.reductions = [];
    this.goes = {};
    this.shifts = false;
    this.inadequate = false;
    this.hash_ = {};
    this.predecessors = null;
    for (var i = this._items.length - 1; i >= 0; i--) {
      this.hash_[this._items[i].id.toString()] = true; //i;
    }
  }

  concat(_set): this {
    const a = _set._items || _set;
    for (let i = a.length - 1; i >= 0; i--) {
      this.hash_[a[i].id] = true; //i;
    }
    this._items = [...this._items, ...a]
    return this;
  }

  addEdge(symbol: string, state: LRGeneratorCollection) {
    this.edges[symbol] = state;
  }

  getEdge(symbol: string): LRGeneratorCollection {
    return this.edges[symbol];
  }

  addPredecessor(symbol: string, state: LRGeneratorItemSet<T>) {
    this.predecessors[symbol] = state;
  }

  push(item: T) {
    this.hash_[item.id] = true;
    return this._items.push(item);
  }

  forEach(callbackFn: (item: T, index: number) => void) {
    this._items.forEach(callbackFn);
  }

  contains(item: T) {
    return this.hash_[item.id];
  }

  valueOf() {
    var v = this._items
      .map((a: T) => a.id)
      .sort()
      .join('|');
    this.valueOf = function toValue_inner() {
      return v;
    };
    return v;
  }

  isEmpty(): boolean {
    return this._items.length === 0;
  }
}
