import { LRGenerator } from './lr-generator';
import { LRGeneratorItemSet } from './lr-generator-item-set';
import { LR1GeneratorItem } from './lr1-generator-item';

export class LR1Generator extends LRGenerator {
  Item: typeof LR1GeneratorItem = LR1GeneratorItem;

  constructor(g, opt) {
    super();
  }

  closureOperation(itemSet /*, closureSet*/ ) {
    let closureSet = new LRGeneratorItemSet();

    let _set = itemSet,
      itemQueue;

    do {
      itemQueue = [];
      closureSet.concat(_set);
      _set.forEach((item) => {
        const symbol = item.markedSymbol;
        let b, r;

        // if token is a nonterminal, recursively add closures
        if (symbol && this.nonTerminals[symbol]) {
          r = item.remainingHandle();
          b = this.first(item.remainingHandle());
          if (b.length === 0 || item.production.nullable || this.nullable(r)) {
            b = b.concat(item.follows);
          }
          this.nonTerminals[symbol].productions.forEach((production) => {
            const newItem = new this.Item(production, 0, b);
            if (!closureSet.contains(newItem) && !itemQueue.contains(newItem)) {
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

  lookAheads(state, item) {
    return item.follows;
  }

  go_(symbol: string, handle: string): number {
    return -1;
  }
}