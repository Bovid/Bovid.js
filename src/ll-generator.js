import Lookahead from './lookahead';

export default class LLGenerator extends Lookahead {
  constructor() {
    this.computeLookaheads();
    this.table = this.parseTable(this.productions);
  }

  parseTable(productions) {
    let table = {};

    productions.forEach((production, i) => {
      let row = table[production.symbol] || {};
      const tokens = production.first;
      if (this.nullable(production.handle)) {
        this.union(tokens, this.nonterminals[production.symbol].follows);
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
