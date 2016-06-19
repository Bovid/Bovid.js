export default class LookAhead {
  computeLookAheads() {
    this.computeLookAheads = function () {};
    this.nullableSets();
    this.firstSets();
    this.followSets();
  }

  // calculate follow sets typald on first and nullable
  followSets() {
    if (typeof this.debugCB === 'function') this.debugCB('Computing Follow sets.');

    var productions = this.productions,
        nonterminals = this.nonterminals,
        cont = true;

    // loop until no further changes have been made
    while(cont) {
      cont = false;

      productions.forEach((production, k) => {
        //self.trace(production.symbol,nonterminals[production.symbol].follows);
        // q is used in Simple LALR algorithm determine follows in context
        var q;
        var ctx = !!this.go_;

        var set = [],oldcount;
        for (var i=0,t;t=production.handle[i];++i) {
          if (!nonterminals[t]) continue;

          // for Simple LALR algorithm, self.go_ checks if
          if (ctx)
            q = this.go_(production.symbol, production.handle.slice(0, i));
          var bool = !ctx || q === parseInt(self.nterms_[t], 10);

          if (i === production.handle.length+1 && bool) {
            set = nonterminals[production.symbol].follows;
          } else {
            var part = production.handle.slice(i+1);

            set = this.first(part);
            if (this.nullable(part) && bool) {
              set.push.apply(set, nonterminals[production.symbol].follows);
            }
          }
          oldcount = nonterminals[t].follows.length;
          this.union(nonterminals[t].follows, set);
          if (oldcount !== nonterminals[t].follows.length) {
            cont = true;
          }
        }
      });
    }

    if (typeof this.debugCB === 'function') {
      var i, nt;
      for (i in this.nonterminals) if (this.nonterminals.hasOwnProperty(i)) {
        nt = this.nonterminals[i];
        this.debugCB(nt, '\n');
      }
    }
  }

  // return the FIRST set of a symbol or series of symbols
  first(symbol) {
    // epsilon
    if (symbol === '') {
      return [];
      // RHS
    } else if (symbol instanceof Array) {
      var firsts = [];
      for (var i=0,t;t=symbol[i];++i) {
        if (!this.nonterminals[t]) {
          if (firsts.indexOf(t) === -1)
            firsts.push(t);
        } else {
          firsts
              .concat(this.nonterminals[t].first);
        }
        if (!this.nullable(t))
          break;
      }
      return firsts;
      // terminal
    } else if (!this.nonterminals[symbol]) {
      return [symbol];
      // nonterminal
    } else {
      return this.nonterminals[symbol].first;
    }
  }

  // fixed-point calculation of FIRST sets
  firstSets() {
    if (typeof this.debugCB === 'function') this.debugCB('Computing First sets.');

    var productions = this.productions,
        nonterminals = this.nonterminals,
        self = this,
        cont = true,
        symbol,
        firsts;

    // loop until no further changes have been made
    while(cont) {
      cont = false;

      productions.forEach((production, k) => {
        var firsts = self.first(production.handle);
        if (firsts.length !== production.first.length) {
          production.first = firsts;
          cont=true;
        }
      });

      for (symbol in nonterminals) if (nonterminals.hasOwnProperty(symbol)) {
        firsts = [];
        nonterminals[symbol].productions.forEach((production) => {
          this.union(firsts, production.first);
        });
        if (firsts.length !== nonterminals[symbol].first.length) {
          nonterminals[symbol].first = firsts;
          cont=true;
        }
      }
    }
  }

  // fixed-point calculation of NULLABLE
  nullableSets() {
    if (this.debugCB) this.debugCB('Computing Nullable sets.');

    var firsts = this.firsts = {},
        nonterminals = this.nonterminals,
        self = this,
        cont = true;

    // loop until no further changes have been made
    while(cont) {
      cont = false;

      // check if each production is nullable
      this.productions.forEach((production, k) => {
        if (!production.nullable) {
          for (var i=0,n=0,t;t=production.handle[i];++i) {
            if (self.nullable(t)) n++;
          }
          if (n===i) { // production is nullable if all tokens are nullable
            production.nullable = cont = true;
          }
        }
      });

      //check if each symbol is nullable
      for (var symbol in nonterminals) if (nonterminals.hasOwnProperty(symbol)) {
        if (!this.nullable(symbol)) {
          for (var i=0,production;production=nonterminals[symbol].productions.item(i);i++) {
            if (production.nullable)
              nonterminals[symbol].nullable = cont = true;
          }
        }
      }
    }
  }

  // check if a token or series of tokens is nullable
  nullable(symbol) {
    // epsilon
    if (symbol === '') {
      return true;
      // RHS
    } else if (symbol instanceof Array) {
      for (var i=0,t;t=symbol[i];++i) {
        if (!this.nullable(t))
          return false;
      }
      return true;
      // terminal
    } else if (!this.nonterminals[symbol]) {
      return false;
      // nonterminal
    } else {
      return this.nonterminals[symbol].nullable;
    }
  }

  merge(leftArray, rightArray) {
    var i,
        max,
        lookup = {};

    for (i = 0, max = leftArray.length; i < max; i++) {
      lookup[leftArray[i]] = true;
    }

    for (i = 0, max = rightArray.length; i < max; i++) {
      if (lookup[rightArray[i]]) continue;
      leftArray.push(rightArray[i]);
    }
  }
}
