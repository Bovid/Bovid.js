import Lookahead from './lookahead';

export default class LLGenerator extends Lookahead {
  constructor() {
    super();
    this.computeLookaheads();
    this.table = this.parseTable(this.productions);
  }

  parseTable(productions) {
    const table = {};
    productions.forEach((production, i) => {
      const row = table[production.symbol] || {},
        tokens = production.first;
      if (this.nullable(production.handle)) {
        this.union(tokens, this.nonTerminals[production.symbol].follows);
      }
      tokens.forEach((token) => {
        if (row[token]) {
          row[token].push(i);
          this.conflicts++;
        } else {
          row[token] = [i];
        }
      });
      table[production.symbol] = row;
    });
    return table;
  }
}
