class LALRGenerator extends LRGenerator {
  constructor(grammar, options) {
    super();
    options = options || {};
    this.states = this.canonicalCollection();
    this.terms_ = {};
    var newg = this.newg = new LALRGrammar(this);
    this.inadequateStates = [];

    // if true, only lookaheads in inadequate states are computed (faster, larger table)
    // if false, lookaheads for all reductions will be computed (slower, smaller table)
    this.onDemandLookahead = options.onDemandLookahead || false;

    this.buildNewGrammar();
    newg.computeLookaheads();
    this.unionLookaheads();

    this.table = this.parseTable(this.states);
    this.defaultActions = this.findDefaults(this.table);
  }

  lookAheads(state, item) {
    return (!!this.onDemandLookahead && !state.inadequate) ? this.terminals : item.follows;
  }

  go(p, w) {
    var q = parseInt(p, 10);
    for (var i=0;i<w.length;i++) {
      q = this.states.item(q).edges[w[i]] || q;
    }
    return q;
  }

  goPath(p, w) {
    var q = parseInt(p, 10),t,
        path = [];
    for (var i=0;i<w.length;i++) {
      t = w[i] ? q+":"+w[i] : '';
      if (t) this.newg.nterms_[t] = q;
      path.push(t);
      q = this.states.item(q).edges[w[i]] || q;
      this.terms_[t] = w[i];
    }
    return {path: path, endState: q};
  }

  // every disjoint reduction of a nonterminal becomes a produciton in G'
  buildNewGrammar() {
    if (typeof this.debugCB === 'function') {
      this.debugCB(this.states.size()+" states.");
      this.debugCB("Building lookahead grammar.");
    }

    var self = this,
        newg = this.newg;

    this.states.forEach((state, i) => {
      state.forEach((item) => {
        if (item.dotPosition === 0) {
          // new symbols are a combination of state and transition symbol
          var symbol = i+":"+item.production.symbol;
          self.terms_[symbol] = item.production.symbol;
          newg.nterms_[symbol] = i;
          if (!newg.nonterminals[symbol]) {
            newg.nonterminals[symbol] = new NonTerminal(symbol);
          }
          var pathInfo = self.goPath(i, item.production.handle);
          var p = new Production(symbol, pathInfo.path, newg.productions.length);
          newg.productions.push(p);
          newg.nonterminals[symbol].productions.push(p);

          // store the transition that get's 'backed up to' after reduction on path
          var handle = item.production.handle.join(' ');
          var goes = self.states.item(pathInfo.endState).goes;
          if (!goes[handle])
            goes[handle] = [];
          goes[handle].push(symbol);

          //self.trace('new production:',p);
        }
      });
      if (state.inadequate)
        self.inadequateStates.push(i);
    });
  }

  unionLookAheads() {
    if (typeof this.debugCB === 'function') {
      this.debugCB('Computing lookaheads.');
    }

    var self = this,
        newg = this.newg,
        states = !!this.onDemandLookahead ? this.inadequateStates : this.states;

    states.forEach((i) => {
      var state = typeof i === 'number' ? self.states.item(i) : i,
          follows = [];
      if (state.reductions.length)
        state.reductions.forEach((item) => {
          var follows = {};
          for (var k=0;k<item.follows.length;k++) {
            follows[item.follows[k]] = true;
          }
          state.goes[item.production.handle.join(' ')].forEach((symbol) => {
            newg.nonterminals[symbol].follows.forEach((symbol) => {
              var terminal = self.terms_[symbol];
              if (!follows[terminal]) {
                follows[terminal]=true;
                item.follows.push(terminal);
              }
            });
          });
          //self.trace('unioned item', item);
        });
    });
  }
}