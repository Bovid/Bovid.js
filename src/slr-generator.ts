import LRLookaheadGenerator from './lr-lookahead-generator';

export class SLRGenerator extends LRLookaheadGenerator {
  lookAheads(state, item) {
    return this.nonTerminals[item.production.symbol].follows;
  }
}
