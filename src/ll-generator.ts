import { LookAhead } from './lookahead';
import { Production } from './production';

export interface IParseTable {
  [key: number]: number[];
}

export class LLGenerator extends LookAhead {
  table: IParseTable;

  constructor(g, opt) {
    super();
    this.computeLookAheads();
    this.table = this.parseTable(this.productions);
  }

  go_(symbol: string, handle: string): number {
    return -1;
  }

  parseTable(productions: Production[]): IParseTable {
    const table: IParseTable = {};
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
