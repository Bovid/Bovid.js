import Lookahead from './lookahead';

export default class LLGenerator extends Lookahead {
  constructor() {
    this.computeLookaheads();
    this.table = this.parseTable(this.productions);
  }

  parseTable(productions) {
    var table = {},
        self = this;
    productions.forEach((production, i) => {
      var row = table[production.symbol] || {};
      var tokens = production.first;
      if (self.nullable(production.handle)) {
        this.union(tokens, self.nonterminals[production.symbol].follows);
      }
      tokens.forEach((token) => {
        if (row[token]) {
          row[token].push(i);
          self.conflicts++;
        } else {
          row[token] = [i];
        }
      });
      table[production.symbol] = row;
    });

    return table;
  }
}
