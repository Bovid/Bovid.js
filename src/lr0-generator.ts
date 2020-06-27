import { LRGenerator } from './lr-generator';

export class LR0Generator extends LRGenerator {
  constructor() {
    super();
    this.buildTable();
  }
}