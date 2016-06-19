import LRGenerator from 'lr-generator';
import LRGeneratorItemSet from './lr-generator-item-set';

export default class LR1Generator extends LRGenerator {
  lookAheads(state, item) {
    return item.follows;
  }

  closureOperation(itemSet /*, closureSet*/) {
    var closureSet = new LRGeneratorItemSet();
    var self = this;

    var _set = itemSet,
        itemQueue, syms = {};

    do {
      itemQueue = [];
      closureSet.concat(set);
      _set.forEach((item) => {
        var symbol = item.markedSymbol;
        var b, r;

        // if token is a nonterminal, recursively add closures
        if (symbol && self.nonterminals[symbol]) {
          r = item.remainingHandle();
          b = self.first(item.remainingHandle());
          if (b.length === 0 || item.production.nullable || self.nullable(r)) {
            b = b.concat(item.follows);
          }
          self.nonterminals[symbol].productions.forEach((production) => {
            var newItem = new this.Item(production, 0, b);
            if(!closureSet.contains(newItem) && !itemQueue.contains(newItem)) {
              itemQueue.push(newItem);
            }
          });
        } else if (!symbol) {
          // reduction
          closureSet.reductions.push(item);
        }
      });

      _set = itemQueue;
    } while (!itemQueue.isEmpty());

    return closureSet;
  }
}