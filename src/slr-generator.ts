import { LRLookAheadGenerator } from './lr-lookahead-generator';

export class SLRGenerator extends LRLookAheadGenerator {
  lookAheads(state, item) {
    return this.nonTerminals[item.production.symbol].follows;
  }

  go_(symbol: string, handle: string[]): number {
    return -1;
  }
}
