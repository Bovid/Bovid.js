import Lexer from 'jison-lex';
import ebnfParser from 'ebnf-parser';
import { NonTerminal } from './non-terminal';
import { Production } from './production';

export interface IGrammer {
  parseParams: string[];
  options: any;
  actionInclude: () => {} | string;
  moduleInclude: string;
  lex: any;
}

export interface IOptions {
  debug?: boolean;
}

export interface IYYOptions {
  ebnf: boolean;
  flex: boolean;
}

export interface IYY {
  depth?: number;
  options?: IYYOptions;
  parseError?: Error;
  lexer?: any;
  parser?: any;
  actionInclude?: number;
  freshLine?: boolean;
  xed?: boolean;
  ruleSection?: boolean;
  addDeclaration?: () => {};
  lexComment?: () => {};
  lexAction?: () => {};
  prepareString?: () => {};
}

export interface ISymbol<T> {
  $accept?: number;
  [index: number]: T | undefined;
  unshift(...value: T[]): number;
  push(...value: T[]): number;
  forEach(iterator: (value: T, index: number) => void): void;
}

export interface IObjectSymbol<T> {
  $accept?: number;
  [index: number]: T | undefined;
}

export interface ITable<T> {
  [key: string]: T
}

export default class AbstractGenerator {
  debugCB?: (msg: string) => void;
  operators: object;
  productions: Production[];
  productions_: number[] | number[][];
  conflicts: number;
  resolutions: number[][];
  options: IOptions;
  parseParams: string[];
  yy: IYY;
  actionGroups: { [action: string]: string[] };
  nonTerminals: {
    $accept?: NonTerminal;
    [terminal: string]: string[] | NonTerminal;
  };
  symbolId: number;
  symbols: ISymbol<string>;
  symbols_: IObjectSymbol<number>;
  hasErrorRecovery: boolean;
  terminals: (number | string)[];
  terminals_: ITable<number>;
  actionInclude: string;
  moduleInclude: string;
  DEBUG: boolean;
  lexer: Lexer;
  startSymbol: string;
  EOF: string;
  performAction: string;
  
  constructor(grammar: IGrammer | string, opt, debugCB?: (msg: string) => void) {
    this.debugCB = debugCB || null;

    let _grammer: IGrammer;
    if (typeof grammar === 'string') {
      _grammer = ebnfParser.parse(grammar) as IGrammer; //TODO: Convert to typescript
    } else {
      _grammer = grammar as IGrammer;
    }

    const options = { ..._grammer.options, ...opt };
    this.operators = {};
    this.productions = [];
    this.productions_ = null;
    this.conflicts = 0;
    this.resolutions = [];
    this.options = options;
    this.parseParams = _grammer.parseParams;
    this.yy = {}; // accessed as yy free variable in the parser/lexer actions
    this.actionGroups = null;
    this.nonTerminals = null;
    this.symbolId = null;
    this.symbols = null;
    this.symbols_ = null;
    this.hasErrorRecovery = null;
    this.terminals = null;
    this.terminals_ = null;

    // source included in semantic action execution scope
    if (_grammer.actionInclude) {
      if (typeof _grammer.actionInclude === 'function') {
        this.actionInclude = String(_grammer.actionInclude)
          .replace(/^\s*function \(\) \{/, '')
          .replace(/\}\s*$/, '');
      } else {
        this.actionInclude = _grammer.actionInclude;
      }
    }
    this.moduleInclude = _grammer.moduleInclude || '';

    this.DEBUG = options.debug || false;

    this.processGrammar(grammar);

    if (_grammer.lex) {
      this.lexer = new Lexer(_grammer.lex, null, this.terminals_);
    }
  }

  processGrammar(grammar) {
    if (typeof this.debugCB === 'function') this.debugCB('Processing grammar.');

    let bnf = grammar.bnf,
      tokens = grammar.tokens;

    this.nonTerminals = {};

    if (!grammar.bnf && grammar.ebnf) {
      bnf = grammar.bnf = ebnfParser.transform(grammar.ebnf);
    }

    if (tokens) {
      if (typeof tokens === 'string') {
        tokens = tokens.trim().split(' ');
      } else {
        tokens = tokens.slice(0);
      }
    }

    this.symbols = [];

    // calculate precedence of operators
    this.operators = AbstractGenerator.processOperators(grammar.operators);

    // build productions from cfg
    this.buildProductions(bnf);

    if (typeof this.debugCB === 'function') {
      if (tokens && this.terminals.length !== tokens.length) {
        this.debugCB('Warning: declared tokens differ from tokens found in rules.');
        this.debugCB(this.terminals.join(','));
        this.debugCB(tokens);
      }
    }

    // augment the grammar
    this.augmentGrammar(grammar);
  }

  augmentGrammar(grammar) {
    if (this.productions.length === 0) {
      throw new Error('Grammar error: must have at least one rule.');
    }
    // use specified start symbol, or default to first user defined production
    this.startSymbol = grammar.start || grammar.startSymbol || this.productions[0].symbol;
    if (!this.nonTerminals[this.startSymbol]) {
      throw new Error('Grammar error: startSymbol must be a non-terminal found in your grammar.');
    }
    this.EOF = '$end';

    // augment the grammar
    const acceptProduction = new Production('$accept', [this.startSymbol, '$end'], 0);
    this.productions.unshift(acceptProduction);

    // prepend parser tokens
    this.symbols.unshift('$accept', this.EOF);
    this.symbols_.$accept = 0;
    this.symbols_[this.EOF] = 1;
    this.terminals.unshift(this.EOF);

    this.nonTerminals.$accept = new NonTerminal('$accept');
    this.nonTerminals.$accept.productions.push(acceptProduction);

    // add follow $ to start symbol
    (this.nonTerminals[this.startSymbol] as NonTerminal).follows.push(this.EOF);

    if(typeof this.debugCB === 'function') {
      this.symbols.forEach((sym, i) => {
        this.debugCB(sym + '(' + i + ')');
      });
    }
  }

    // set precedence and associativity of operators
  static processOperators(ops) {
    if (!ops) return {};
    const operators = {};
    for (let i = 0, k, prec; prec = ops[i]; i++) {
      for (k=1;k < prec.length;k++) {
        operators[prec[k]] = {precedence: i+1, assoc: prec[0]};
      }
    }
    return operators;
  }

  buildProductions(bnf) {
    let actions = [
      '/* this == yyval */',
      this.actionInclude || '',
      'var $0 = $$.length - 1;',
      'switch (yystate) {'
    ];
    const actionGroups = this.actionGroups = {};
    let prods, symbol;
    const productions_ = [0];
    this.symbolId = 1;
    const symbols_: IObjectSymbol<number> = this.symbols_ = {};

    this.hasErrorRecovery = false; // has error recovery

    // add error symbol; will be third symbol, or '2' ($accept, $end, error)
    this.addSymbol('error');

    for (symbol in bnf) {
      if (!bnf.hasOwnProperty(symbol)) continue;

      this.addSymbol(symbol);
      this.nonTerminals[symbol] = new NonTerminal(symbol);

      if (typeof bnf[symbol] === 'string') {
        prods = bnf[symbol].split(/\s*\|\s*/g);
      } else {
        prods = bnf[symbol].slice(0);
      }

      for (let i = 0; i < prods.length; i++) {
        this.buildProduction(symbol, prods[i]);
      }
    }
    for (let action in actionGroups) if (actionGroups.hasOwnProperty(action)) {
      actions.push(actionGroups[action].join(' '), action, 'break;');
    }

    let sym: number, id: string;
    this.terminals = [];
    this.terminals_ = {};
    for (id in symbols_) if (symbols_.hasOwnProperty(id)) {
      sym = symbols_[id];
      if (!this.nonTerminals[sym]) {
        this.terminals.push(sym);
        this.terminals_[id] = sym;
      }
    }
    this.symbols_ = symbols_;

    this.productions_ = productions_;
    actions.push('}');

    let parameters = 'yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */, _$ /* lstack */';
    if (this.parseParams) {
      parameters += ', ' + this.parseParams.join(', ');
    }

    const actionsBody = actions.join('\n')
      .replace(/YYABORT/g, 'return false')
      .replace(/YYACCEPT/g, 'return true');
    this.performAction = `function anonymous(${ parameters }) {\n${ actionsBody }\n}`;
  }

  createParser() {
    throw new Error('Calling abstract method.');
  }

  generatorDebug() {
    throw new Error('Calling abstract method.');
  }

  buildProduction(symbol, handle) {
    let r: Production, rhs: string[], i;
    if (handle.constructor === Array) {
      rhs = (typeof handle[0] === 'string') ?
        handle[0].trim().split(' ') :
        handle[0].slice(0);

      for (i=0; i<rhs.length; i++) {
        if (rhs[i] === 'error') this.hasErrorRecovery = true;
        if (!this.symbols_[rhs[i]]) {
          this.addSymbol(rhs[i]);
        }
      }

      if (typeof handle[1] === 'string' || handle.length === 3) {
        // semantic action specified
        const label = `case ${this.productions.length + 1}:`;
        let action = handle[1];

        // replace named semantic values ($nonterminal)
        if (action.match(/[$@][a-zA-Z][a-zA-Z0-9_]*/)) {
          const count = {},
            names = {};
          for (i=0;i<rhs.length;i++) {
            // check for aliased names, e.g., id[alias]
            const match = rhs[i].match(/\[[a-zA-Z][a-zA-Z0-9_-]*\]/);
            let rhs_i:string;
            if (match) {
              rhs_i = match[0].substr(1, match[0].length-2);
              rhs[i] = rhs[i].substr(0, rhs[i].indexOf('['));
            } else {
              rhs_i = rhs[i];
            }

            if (names[rhs_i]) {
              names[rhs_i + (++count[rhs_i])] = i+1;
            } else {
              names[rhs_i] = i + 1;
              names[rhs_i + '1'] = i + 1;
              count[rhs_i] = 1;
            }
          }
          action = action
            .replace(/\$([a-zA-Z][a-zA-Z0-9_]*)/g, (str, pl) => {
              return names[pl] ? '$'+names[pl] : str;
            })
            .replace(/@([a-zA-Z][a-zA-Z0-9_]*)/g, (str, pl) => {
              return names[pl] ? '@'+names[pl] : str;
            });
        }
        action = action
        // replace references to $$ with this.$, and @$ with this._$
          .replace(/([^'"])\$\$|^\$\$/g, '$1this.$')
          .replace(/@[0$]/g, 'this._$')

          // replace semantic value references ($n) with stack value (stack[n])
          .replace(/\$(-?\d+)/g, (_, n) => {
            return '$$[$0' + (parseInt(n, 10) - rhs.length || '') + ']';
          })
          // same as above for location references (@n)
          .replace(/@(-?\d+)/g, (_, n) => {
            return '_$[$0' + (n - rhs.length || '') + ']';
          });
        if (action in this.actionGroups) {
          this.actionGroups[action].push(label);
        } else {
          this.actionGroups[action] = [label];
        }

        // done with aliases; strip them.
        rhs = rhs.map((e,i) => { return e.replace(/\[[a-zA-Z_][a-zA-Z0-9_-]*\]/g, '') });
        r = new Production(symbol, rhs, this.productions.length + 1);
        // precedence specified also
        if (handle[2] && this.operators[handle[2].prec]) {
          r.precedence = this.operators[handle[2].prec].precedence;
        }
      } else {
        // no action -> don't care about aliases; strip them.
        rhs = rhs.map((e,i) => { return e.replace(/\[[a-zA-Z_][a-zA-Z0-9_-]*\]/g, '') });
        // only precedence specified
        r = new Production(symbol, rhs, this.productions.length + 1);
        if (this.operators[handle[1].prec]) {
          r.precedence = this.operators[handle[1].prec].precedence;
        }
      }
    } else {
      // no action -> don't care about aliases; strip them.
      handle = handle.replace(/\[[a-zA-Z_][a-zA-Z0-9_-]*\]/g, '');
      rhs = handle.trim().split(' ');
      for (i=0; i<rhs.length; i++) {
        if (rhs[i] === 'error') this.hasErrorRecovery = true;
        if (!this.symbols_[rhs[i]]) {
          this.addSymbol(rhs[i]);
        }
      }
      r = new Production(symbol, rhs, this.productions.length + 1);
    }
    if (r.precedence === 0) {
      // set precedence
      for (i=r.handle.length-1; i>=0; i--) {
        if (!(r.handle[i] in this.nonTerminals) && r.handle[i] in this.operators) {
          r.precedence = this.operators[r.handle[i]].precedence;
        }
      }
    }

    this.productions.push(r);
    this.productions_.push([this.symbols_[r.symbol], r.handle[0] === '' ? 0 : r.handle.length]);
    this.nonTerminals[symbol].productions.push(r);
  }

  addSymbol(s) {
    if (s && !this.symbols_[s]) {
      this.symbols_[s] = ++this.symbolId;
      this.symbols.push(s);
    }
  }
}
