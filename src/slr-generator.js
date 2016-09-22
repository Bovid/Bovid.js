import LRLookaheadGenerator from './lr-lookahead-generator';

export default class SLRGenerator extends LRLookaheadGenerator {
  lookaheads(state, item) {
    return this.nonterminals[item.production.symbol].follows;
  }
}
