import { LRGenerator } from './lr-generator';
import { LALRGrammar } from './lalr-grammar';
import { Production } from './production';
import { NonTerminal } from './non-terminal';

export interface IHash {
  [name: string]: string;
}

export class LALRGenerator extends LRGenerator {
  terms_: IHash;
  newg: LALRGrammar;
  inadequateStates: number[];
  onDemandLookAhead: boolean;
  terminals: IHash;
  
  constructor(grammar, options) {
    super();
    options = options || {};
    this.states = this.canonicalCollection();
    this.terms_ = {};
    const newg = this.newg = new LALRGrammar(this);
    this.inadequateStates = [];

    // if true, only lookAheads in inadequate states are computed (faster, larger table)
    // if false, lookAheads for all reductions will be computed (slower, smaller table)
    this.onDemandLookAhead = options.onDemandLookAhead || false;

    this.buildNewGrammar();
    newg.computeLookAheads();
    this.unionLookAheads();

    this.table = this.parseTable(this.states);
    this.defaultActions = this.findDefaults(this.table);
  }

  lookAheads(state, item) {
    return (!!this.onDemandLookAhead && !state.inadequate) ? this.terminals : item.follows;
  }

  go(p, w) {
    let q = parseInt(p, 10);
    for (let i = 0; i < w.length; i++) {
      q = this.states[q].edges[w[i]] || q;
    }
    return q;
  }

  goPath(p, w) {
    let q = parseInt(p, 10),
      t,
      path = [];
    for (let i = 0; i < w.length; i++) {
      t = w[i] ? `${q}:${w[i]}` : '';
      if (t) this.newg.nterms_[t] = q;
      path.push(t);
      q = this.states[q].edges[w[i]] || q;
      this.terms_[t] = w[i];
    }
    return { path: path, endState: q };
  }

  // every disjoint reduction of nonTerminals becomes a production in G'
  buildNewGrammar() {
    if (typeof this.debugCB === 'function') {
      this.debugCB(this.states.length + ' states.');
      this.debugCB('Building lookahead grammar.');
    }
    const newg = this.newg;
    this.states.forEach((state, i) => {
      state.forEach((item) => {
        if (item.dotPosition === 0) {
          // new symbols are a combination of state and transition symbol
          const symbol = `${ i }:${ item.production.symbol }`;
          this.terms_[symbol] = item.production.symbol;
          newg.nterms_[symbol] = i;
          if (!newg.nonTerminals[symbol]) {
            newg.nonTerminals[symbol] = new NonTerminal(symbol);
          }
          const pathInfo = this.goPath(i, item.production.handle);
          const p = new Production(symbol, pathInfo.path, newg.productions.length);
          newg.productions.push(p);
          newg.nonTerminals[symbol].productions.push(p);

          // store the transition that get's 'backed up to' after reduction on path
          const handle = item.production.handle.join(' ');
          const goes = this.states[pathInfo.endState].goes;
          if (!goes[handle]) {
            goes[handle] = [];
          }
          goes[handle].push(symbol);

          //self.trace('new production:',p);
        }
      });
      if (state.inadequate) {
        this.inadequateStates.push(i);
      }
    });
  }

  unionLookAheads() {
    if (typeof this.debugCB === 'function') {
      this.debugCB('Computing lookAheads.');
    }

    const newg = this.newg,
      states = !!this.onDemandLookAhead ? this.inadequateStates : this.states;

    states.forEach((i) => {
      const state = typeof i === 'number' ? this.states[i] : i;
      if (state.reductions.length)
        state.reductions.forEach((item) => {
          const follows = {};
          for (let k = 0; k < item.follows.length; k++) {
            follows[item.follows[k]] = true;
          }
          state.goes[item.production.handle.join(' ')].forEach((symbol) => {
            newg.nonTerminals[symbol].follows.forEach((symbol) => {
              const terminal = this.terms_[symbol];
              if (!follows[terminal]) {
                follows[terminal]=true;
                item.follows.push(terminal);
              }
            });
          });
          //this.trace('unioned item', item);
        });
    });
  }
}