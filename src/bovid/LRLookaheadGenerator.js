class LRLookaheadGenerator extends LRGenerator {
  constructor() {
    super();

    this.computeLookaheads();
    this.buildTable();
  }
}