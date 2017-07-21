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

    let cont = true;

    // loop until no further changes have been made
    while(cont) {
      cont = false;

      this.productions.forEach((production, k) => {
        //this.trace(production.symbol,nonTerminals[production.symbol].follows);
        // q is used in Simple LALR algorithm determine follows in context
        let q;
        const ctx = !!this.go_;

        let set = [],
          oldcount;
        for (let i = 0, t; t = production.handle[i]; ++i) {
          if (!this.nonTerminals[t]) continue;

          // for Simple LALR algorithm, this.go_ checks if
          if (ctx) {
            q = this.go_(production.symbol, production.handle.slice(0, i));
          }
          const bool = !ctx || q === parseInt(this.nonTerminals_[t], 10);

          if (i === production.handle.length+1 && bool) {
            set = this.nonTerminals[production.symbol].follows;
          } else {
            const part = production.handle.slice(i+1);
            set = this.first(part);
            if (this.nullable(part) && bool) {
              set.push.apply(set, this.nonTerminals[production.symbol].follows);
            }
          }
          oldcount = this.nonTerminals[t].follows.length;
          this.union(this.nonTerminals[t].follows, set);
          if (oldcount !== this.nonTerminals[t].follows.length) {
            cont = true;
          }
        }
      });
    }

    if (typeof this.debugCB === 'function') {
      let nt;
      for (let i in this.nonTerminals) if (this.nonTerminals.hasOwnProperty(i)) {
        nt = this.nonTerminals[i];
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
      const firsts = [];
      for (let i = 0, t; t = symbol[i]; ++i) {
        if (!this.nonTerminals[t]) {
          if (firsts.indexOf(t) === -1)
            firsts.push(t);
        } else {
          firsts.concat(this.nonTerminals[t].first);
        }
        if (!this.nullable(t))
          break;
      }
      return firsts;
      // terminal
    } else if (!this.nonTerminals[symbol]) {
      return [symbol];
      // nonterminal
    } else {
      return this.nonTerminals[symbol].first;
    }
  }

  // fixed-point calculation of FIRST sets
  firstSets() {
    if (typeof this.debugCB === 'function') this.debugCB('Computing First sets.');

    let cont = true,
        symbol,
        firsts;

    // loop until no further changes have been made
    while(cont) {
      cont = false;

      this.productions.forEach((production, k) => {
        const firsts = this.first(production.handle);
        if (firsts.length !== production.first.length) {
          production.first = firsts;
          cont=true;
        }
      });

      for (symbol in nonTerminals) if (nonTerminals.hasOwnProperty(symbol)) {
        firsts = [];
        nonTerminals[symbol].productions.forEach((production) => {
          this.union(firsts, production.first);
        });
        if (firsts.length !== this.nonTerminals[symbol].first.length) {
          this.nonTerminals[symbol].first = firsts;
          cont = true;
        }
      }
    }
  }

  // fixed-point calculation of NULLABLE
  nullableSets() {
    if (this.debugCB) this.debugCB('Computing Nullable sets.');

    const nonTerminals = this.nonTerminals;
    let firsts = this.firsts = {},
        cont = true;

    // loop until no further changes have been made
    while(cont) {
      cont = false;

      // check if each production is nullable
      this.productions.forEach((production, k) => {
        if (!production.nullable) {
          for (let i = 0, n = 0, t; t = production.handle[i]; ++i) {
            if (this.nullable(t)) n++;
          }
          if (n===i) { // production is nullable if all tokens are nullable
            production.nullable = cont = true;
          }
        }
      });

      //check if each symbol is nullable
      for (let symbol in nonTerminals) if (nonTerminals.hasOwnProperty(symbol)) {
        if (!this.nullable(symbol)) {
          for (let i = 0,production; production = nonTerminals[symbol].productions.item(i); i++) {
            if (production.nullable) {
              nonTerminals[symbol].nullable = cont = true;
            }
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
      for (let i = 0, t; t = symbol[i]; ++i) {
        if (!this.nullable(t))
          return false;
      }
      return true;
      // terminal
    } else if (!this.nonTerminals[symbol]) {
      return false;
      // nonterminal
    } else {
      return this.nonTerminals[symbol].nullable;
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
