export default class LRGeneratorItemSet {
  constructor() {
    this.reductions = [];
    this.goes = {};
    this.edges = {};
    this.shifts = false;
    this.inadequate = false;
    this.hash_ = {};
    
    for (let i = this._items.length - 1; i >= 0; i--) {
      this.hash_[this._items[i].id] = true; //i;
    }
  }

  concat(_set) {
    const a = _set._items || _set;
    
    for (let i = a.length - 1; i >= 0; i--) {
      this.hash_[a[i].id] = true; //i;
    }
    
    this._items.push.apply(this._items, a);
    return this;
  }

  contains(item) {
    return this.hash_[item.id];
  }

  push(item) {
    this.hash_[item.id] = true;
    return this._items.push(item);
  }

  valueOf() {
    const v = this._items.map(function (a) {
      return a.id;
    }).sort().join('|');

    this.valueOf = function toValue_inner() {
      return v;
    };
    
    return v;
  }
}
