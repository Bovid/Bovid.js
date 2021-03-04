import { LRGenerator } from './lr-generator';

export class LR0Generator extends LRGenerator {
  Item: typeof LR0
  constructor(g, opt) {
    super();
    this.buildTable();
  }

  go_(symbol: string, handle: string): number {
    return -1;
  }
}