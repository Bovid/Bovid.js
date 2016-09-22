import LRGenerator from './lr-generator';

export default class LR0Generator extends LRGenerator {
  constructor() {
    super();
    this.buildTable();
  }
}