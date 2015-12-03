import 'jison-lex';
import 'ebnf-parser';

class AbstractGenerator {
  constructor(grammar, opt, debugCB) {
    this.debugCB = debugCB || null;

    if (typeof grammar === 'string') {
      grammar = ebnfParser.parse(grammar);
    }

    var options = Object.assign({}, grammar.options, opt);
    this.terms = {};
    this.operators = {};
    this.productions = [];
    this.conflicts = 0;
    this.resolutions = [];
    this.options = options;
    this.parseParams = grammar.parseParams;
    this.yy = {}; // accessed as yy free variable in the parser/lexer actions

    // source included in semantic action execution scope
    if (grammar.actionInclude) {
      if (typeof grammar.actionInclude === 'function') {
        grammar.actionInclude = String(grammar.actionInclude)
            .replace(/^\s*function \(\) \{/, '')
            .replace(/\}\s*$/, '');
      }
      this.actionInclude = grammar.actionInclude;
    }
    this.moduleInclude = grammar.moduleInclude || '';

    this.DEBUG = options.debug || false;
    if (this.DEBUG) this.mix(generatorDebug); // mixin debug methods

    this.processGrammar(grammar);

    if (grammar.lex) {
      this.lexer = new Lexer(grammar.lex, null, this.terminals_);
    }

    if (this.init !== undefined) {
      this.init();
    }
  }

  processGrammar(grammar) {
    if (typeof this.debugCB === 'function') this.debugCB("Processing grammar.");

    var bnf = grammar.bnf,
        tokens = grammar.tokens,
        nonterminals = this.nonterminals = {},
        productions = this.productions;

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

    var symbols = this.symbols = [];

    // calculate precedence of operators
    var operators = this.operators = this.processOperators(grammar.operators);

    // build productions from cfg
    this.buildProductions(bnf, productions, nonterminals, symbols, operators);

    if (typeof this.debugCB === 'function') {
      if (tokens && this.terminals.length !== tokens.length) {
        this.debugCB("Warning: declared tokens differ from tokens found in rules.");
        this.debugCB(this.terminals);
        this.debugCB(tokens);
      }
    }

    // augment the grammar
    this.augmentGrammar(grammar);
  }

  augmentGrammar(grammar) {
    if (this.productions.length === 0) {
      throw new Error("Grammar error: must have at least one rule.");
    }
    // use specified start symbol, or default to first user defined production
    this.startSymbol = grammar.start || grammar.startSymbol || this.productions[0].symbol;
    if (!this.nonterminals[this.startSymbol]) {
      throw new Error("Grammar error: startSymbol must be a non-terminal found in your grammar.");
    }
    this.EOF = "$end";

    // augment the grammar
    var acceptProduction = new Production('$accept', [this.startSymbol, '$end'], 0);
    this.productions.unshift(acceptProduction);

    // prepend parser tokens
    this.symbols.unshift("$accept",this.EOF);
    this.symbols_.$accept = 0;
    this.symbols_[this.EOF] = 1;
    this.terminals.unshift(this.EOF);

    this.nonterminals.$accept = new NonTerminal("$accept");
    this.nonterminals.$accept.productions.push(acceptProduction);

    // add follow $ to start symbol
    this.nonterminals[this.startSymbol].follows.push(this.EOF);

    if(typeof this.debugCB === 'function') {
      this.symbols.forEach((sym, i) => {
        this.debugCB(sym + "(" + i + ")");
      });
    }
  }

    // set precedence and associativity of operators
  static processOperators(ops) {
    if (!ops) return {};
    var operators = {};
    for (var i=0,k,prec;prec=ops[i]; i++) {
      for (k=1;k < prec.length;k++) {
        operators[prec[k]] = {precedence: i+1, assoc: prec[0]};
      }
    }
    return operators;
  }

  buildProductions(bnf, productions, nonterminals, symbols, operators) {
    var actions = [
      '/* this == yyval */',
      this.actionInclude || '',
      'var $0 = $$.length - 1;',
      'switch (yystate) {'
    ];
    var actionGroups = {};
    var prods, symbol;
    var productions_ = [0];
    var symbolId = 1;
    var symbols_ = {};

    var her = false; // has error recovery

    function addSymbol (s) {
      if (s && !symbols_[s]) {
        symbols_[s] = ++symbolId;
        symbols.push(s);
      }
    }

    // add error symbol; will be third symbol, or "2" ($accept, $end, error)
    addSymbol("error");

    for (symbol in bnf) {
      if (!bnf.hasOwnProperty(symbol)) continue;

      addSymbol(symbol);
      nonterminals[symbol] = new bovid.NonTerminal(symbol);

      if (typeof bnf[symbol] === 'string') {
        prods = bnf[symbol].split(/\s*\|\s*/g);
      } else {
        prods = bnf[symbol].slice(0);
      }

      prods.forEach(buildProduction);
    }
    for (var action in actionGroups) if (actionGroups.hasOwnProperty(action)) {
      actions.push(actionGroups[action].join(' '), action, 'break;');
    }

    var sym, terms = [], terms_ = {}, id;
    for (id in symbols_) if (symbols_.hasOwnProperty(id)) {
      sym = symbols_[id];
      if (!nonterminals[sym]) {
        terms.push(sym);
        terms_[id] = sym;
      }
    }

    this.hasErrorRecovery = her;

    this.terminals = terms;
    this.terminals_ = terms_;
    this.symbols_ = symbols_;

    this.productions_ = productions_;
    actions.push('}');

    actions = actions.join("\n")
        .replace(/YYABORT/g, 'return false')
        .replace(/YYACCEPT/g, 'return true');

    var parameters = "yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */, _$ /* lstack */";
    if (this.parseParams) parameters += ', ' + this.parseParams.join(', ');

    this.performAction = "function anonymous(" + parameters + ") {\n" + actions + "\n}";

    function buildProduction (handle) {
      var r, rhs, i;
      if (handle.constructor === Array) {
        rhs = (typeof handle[0] === 'string') ?
            handle[0].trim().split(' ') :
            handle[0].slice(0);

        for (i=0; i<rhs.length; i++) {
          if (rhs[i] === 'error') her = true;
          if (!symbols_[rhs[i]]) {
            addSymbol(rhs[i]);
          }
        }

        if (typeof handle[1] === 'string' || handle.length == 3) {
          // semantic action specified
          var label = 'case ' + (productions.length+1) + ':', action = handle[1];

          // replace named semantic values ($nonterminal)
          if (action.match(/[$@][a-zA-Z][a-zA-Z0-9_]*/)) {
            var count = {},
                names = {};
            for (i=0;i<rhs.length;i++) {
              // check for aliased names, e.g., id[alias]
              var rhs_i = rhs[i].match(/\[[a-zA-Z][a-zA-Z0-9_-]*\]/);
              if (rhs_i) {
                rhs_i = rhs_i[0].substr(1, rhs_i[0].length-2);
                rhs[i] = rhs[i].substr(0, rhs[i].indexOf('['));
              } else {
                rhs_i = rhs[i];
              }

              if (names[rhs_i]) {
                names[rhs_i + (++count[rhs_i])] = i+1;
              } else {
                names[rhs_i] = i+1;
                names[rhs_i + "1"] = i+1;
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
              .replace(/@[0$]/g, "this._$")

              // replace semantic value references ($n) with stack value (stack[n])
              .replace(/\$(-?\d+)/g, (_, n) => {
                return "$$[$0" + (parseInt(n, 10) - rhs.length || '') + "]";
              })
              // same as above for location references (@n)
              .replace(/@(-?\d+)/g, (_, n) => {
                return "_$[$0" + (n - rhs.length || '') + "]";
              });
          if (action in actionGroups) {
            actionGroups[action].push(label);
          } else {
            actionGroups[action] = [label];
          }

          // done with aliases; strip them.
          rhs = rhs.map((e,i) => { return e.replace(/\[[a-zA-Z_][a-zA-Z0-9_-]*\]/g, '') });
          r = new Production(symbol, rhs, productions.length+1);
          // precedence specified also
          if (handle[2] && operators[handle[2].prec]) {
            r.precedence = operators[handle[2].prec].precedence;
          }
        } else {
          // no action -> don't care about aliases; strip them.
          rhs = rhs.map((e,i) => { return e.replace(/\[[a-zA-Z_][a-zA-Z0-9_-]*\]/g, '') });
          // only precedence specified
          r = new Production(symbol, rhs, productions.length+1);
          if (operators[handle[1].prec]) {
            r.precedence = operators[handle[1].prec].precedence;
          }
        }
      } else {
        // no action -> don't care about aliases; strip them.
        handle = handle.replace(/\[[a-zA-Z_][a-zA-Z0-9_-]*\]/g, '');
        rhs = handle.trim().split(' ');
        for (i=0; i<rhs.length; i++) {
          if (rhs[i] === 'error') her = true;
          if (!symbols_[rhs[i]]) {
            addSymbol(rhs[i]);
          }
        }
        r = new Production(symbol, rhs, productions.length+1);
      }
      if (r.precedence === 0) {
        // set precedence
        for (i=r.handle.length-1; i>=0; i--) {
          if (!(r.handle[i] in nonterminals) && r.handle[i] in operators) {
            r.precedence = operators[r.handle[i]].precedence;
          }
        }
      }

      productions.push(r);
      productions_.push([symbols_[r.symbol], r.handle[0] === '' ? 0 : r.handle.length]);
      nonterminals[symbol].productions.push(r);
    }
  }

  createParser() {
    throw new Error('Calling abstract method.');
  }
}