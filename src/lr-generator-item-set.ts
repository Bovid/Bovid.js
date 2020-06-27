import { Production } from './production';

export interface IHash {
  [id: string]: boolean;
}

export class LRGeneratorItemSet {
  reductions: number[];
  goes: any;
  edges: any;
  shifts: boolean;
  inadequate: boolean;
  hash_: IHash;
  _items: Production[];

  constructor() {
    this.reductions = [];
    this.goes = {};
    this.edges = {};
    this.shifts = false;
    this.inadequate = false;
    this.hash_ = {};
    for (var i = this._items.length - 1; i >= 0; i--) {
      this.hash_[this._items[i].id.toString()] = true; //i;
    }
  }

  concat(_set) {
    var a = _set._items || _set;
    for (var i = a.length - 1; i >= 0; i--) {
      this.hash_[a[i].id] = true; //i;
    }
    this._items.push.apply(this._items, a);
    return this;
  }

  push(item) {
    this.hash_[item.id] = true;
    return this._items.push(item);
  }

  contains(item) {
    return this.hash_[item.id];
  }

  valueOf() {
    var v = this._items.map(function (a) {
      return a.id;
    }).sort().join('|');
    this.valueOf = function toValue_inner() {
      return v;
    };
    return v;
  }
}
