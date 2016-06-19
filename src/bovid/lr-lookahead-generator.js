import LRGenerator from './lr-generator';

export default class LRLookaheadGenerator extends LRGenerator {
  constructor() {
    super();

    this.computeLookaheads();
    this.buildTable();
  }
}
