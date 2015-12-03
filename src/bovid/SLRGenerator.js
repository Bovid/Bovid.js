class SLRGenerator extends LRLookaheadGenerator {
  lookAheads(state, item) {
    return this.nonterminals[item.production.symbol].follows;
  }
}