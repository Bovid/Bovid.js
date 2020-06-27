import { LookAhead } from './lookahead';
import { NonTerminal } from './non-terminal';

export class LALRGrammar extends LookAhead {
  originalGrammmar: any;
  constructor(originalGrammar: any) {
    super();
    this.nonTerminals_ = [];
    this.originalGrammmar = originalGrammar;
    this.nonTerminals = [];
    this.productions = [];
  }

  go_(r: string, B: string[]) {
    r = r.split(':')[0]; // grab state #
    B = B.map((b) => {
      return b.slice(b.indexOf(':') + 1);
    });

    return this.originalGrammmar.go(r, B);
  }
}
