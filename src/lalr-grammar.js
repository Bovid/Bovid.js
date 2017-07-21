import Lookahead from './lookahead';

export default class LALRGrammar extends Lookahead {
  constructor(originalGrammar) {
    super();
    this.nonTerminals_ = {};
    this.originalGrammmar = originalGrammar;
    this.nonTerminals = {};
    this.productions = [];
  }

  go_(r, B) {
    r = r.split(':')[0]; // grab state #
    B = B.map((b) => {
      return b.slice(b.indexOf(':') + 1);
    });

    return this.originalGrammmar.go(r, B);
  }
}
