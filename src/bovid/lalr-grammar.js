import Lookahead from './lookahead';

export default class LALRGrammar extends Lookahead {
  var nterms_ = {};

  constructor(originalGrammar) {
    this.originalGrammmar = originalGrammar;
    this.nonterminals = {};
    this.productions = [];
  }

  go_(r, B) {
    r = r.split(":")[0]; // grab state #
    B = B.map((b) => {
      return b.slice(b.indexOf(":") + 1);
    });

    return this.originalGrammmar.go(r, B);
  }
}
