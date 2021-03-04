import { LRGenerator } from './lr-generator';

export class LRLookAheadGenerator extends LRGenerator {
  constructor(g, opt) {
    super();

    this.computeLookAheads();
    this.buildTable();
  }

  go_(symbol: string, handle: string): number {
    return -1;
  }
}
