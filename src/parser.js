import ParseLocation from './parse-location';
const TERROR = 2;
const EOF = 1;

export default class Parser {
  construct(dict) {
    this.table = dict.table;
    this.defaultActions = dict.defaultActions;
    this.performAction = dict.performAction;
    this.productions_ = dict.productions_;
    this.symbols_ = dict.symbols_;
    this.terminals_ = dict.terminals_;
    this.stack = null;
    this.tstack = null;
    this.vstack = null;
    this.lstack = null;
    this.lexer = null;
    this.yy = null;
  }

  setLexer(lexer) {
    this.lexer = lexer;
  }

  parse(input) {
    var stack = this.stack = [0],
        tstack = this.tstack = [], // token stack
        vstack = this.vstack = [null], // semantic value stack
        lstack = this.lstack = [], // location stack
        table = this.table,
        yytext = '',
        yylineno = 0,
        yyleng = 0,
        recovering = 0;

    var args = lstack.slice.call(arguments, 1);

    //this.reductionCount = this.shiftCount = 0;
    var lexer = this.lexer;
    var sharedState = {yy: {}};
    // copy state
    for (var k in this.yy) {
      if (Object.prototype.hasOwnProperty.call(this.yy, k)) {
        sharedState.yy[k] = this.yy[k];
      }
    }

    lexer.setInput(input, sharedState.yy);
    sharedState.yy.lexer = lexer;
    sharedState.yy.parser = this;
    if (typeof lexer.yylloc === 'undefined') {
      lexer.yylloc = {};
    }
    var yyloc = lexer.yylloc;
    lstack.push(yyloc);

    var ranges = lexer.options && lexer.options.ranges;

    if (typeof sharedState.yy.parseError === 'function') {
      this.parseError = sharedState.yy.parseError;
    } else {
      this.parseError = Object.getPrototypeOf(this).parseError;
    }

    _token_stack:
    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
    while (true) {
      // retrieve state number from top of stack
      state = stack[stack.length - 1];

      // use default actions if available
      if (this.defaultActions[state]) {
        action = this.defaultActions[state];
      } else {
        if (symbol === null || typeof symbol === 'undefined') {
          symbol = this.lex();
        }
        // read action for current state and first input
        action = table[state] && table[state][symbol];
      }

      _handle_error:
        // handle parse error
          if (typeof action === 'undefined' || !action.length || !action[0]) {
            var error_rule_depth;
            var errStr = '';

            if (!recovering) {
              // first see if there's any chance at hitting an error recovery rule:
              error_rule_depth = this.locateNearestErrorRecoveryRule(state);

              // Report error
              expected = [];
              for (p in table[state]) {
                if (this.terminals_[p] && p > TERROR) {
                  expected.push("'" + this.terminals_[p] + "'");
                }
              }
              if (lexer.showPosition) {
                errStr = 'Parse error on line ' + (yylineno + 1) + ":\n" + lexer.showPosition() + "\nExpecting " + expected.join(', ') + ", got '" + (this.terminals_[symbol] || symbol) + "'";
              } else {
                errStr = 'Parse error on line ' + (yylineno + 1) + ": Unexpected " +
                    (symbol === EOF ? "end of input" :
                        ("'" + (this.terminals_[symbol] || symbol) + "'"));
              }
              return this.parseError(errStr, {
                text: lexer.match,
                token: this.terminals_[symbol] || symbol,
                line: lexer.yylineno,
                loc: yyloc,
                expected: expected,
                recoverable: (error_rule_depth !== false)
              });
            } else if (preErrorSymbol !== EOF) {
              error_rule_depth = this.locateNearestErrorRecoveryRule(state);
            }

            // just recovered from another error
            if (recovering === 3) {
              if (symbol === EOF || preErrorSymbol === EOF) {
                throw new Error(errStr || 'Parsing halted while starting to recover from another error.');
              }

              // discard current lookahead and grab another
              yyleng = lexer.yyleng;
              yytext = lexer.yytext;
              yylineno = lexer.yylineno;
              yyloc = lexer.yylloc;
              symbol = this.lex();
            }

            // try to recover from error
            if (error_rule_depth === false) {
              throw new Error(errStr || 'Parsing halted. No suitable error recovery rule available.');
            }
            this.popStack(error_rule_depth);

            preErrorSymbol = (symbol === TERROR ? null : symbol); // save the lookahead token
            symbol = TERROR;     // insert generic error symbol as new lookahead
            state = stack[stack.length - 1];
            action = table[state] && table[state][TERROR];
            recovering = 3; // allow 3 real symbols to be shifted before reporting a new error
          }

      // this shouldn't happen, unless resolve defaults are off
      if (action[0] instanceof Array && action.length > 1) {
        throw new Error('Parse Error: multiple actions possible at state: ' + state + ', token: ' + symbol);
      }

      switch (action[0]) {
        case 1: // shift
          //this.shiftCount++;

          stack.push(symbol);
          vstack.push(lexer.yytext);
          lstack.push(lexer.yylloc);
          stack.push(action[1]); // push state
          symbol = null;
          if (!preErrorSymbol) { // normal execution/no error
            yyleng = lexer.yyleng;
            yytext = lexer.yytext;
            yylineno = lexer.yylineno;
            yyloc = lexer.yylloc;
            if (recovering > 0) {
              recovering--;
            }
          } else {
            // error just occurred, resume old lookahead f/ before error
            symbol = preErrorSymbol;
            preErrorSymbol = null;
          }
          break;

        case 2:
          // reduce
          //this.reductionCount++;

          len = this.productions_[action[1]][1];

          // perform semantic action
          yyval.$ = vstack[vstack.length - len]; // default to $$ = $1
          // default location, uses first token for firsts, last for lasts
          yyval._$ = new ParseLocation(
            lstack[lstack.length - (len || 1)].first_line,
            lstack[lstack.length - 1].last_line,
            lstack[lstack.length - (len || 1)].first_column,
            lstack[lstack.length - 1].last_column
          );
          if (ranges) {
            yyval._$.range = [lstack[lstack.length - (len || 1)].range[0], lstack[lstack.length - 1].range[1]];
          }
          r = this.performAction.apply(yyval, [yytext, yyleng, yylineno, sharedState.yy, action[1], vstack, lstack].concat(args));

          if (typeof r !== 'undefined') {
            return r;
          }

          // pop off stack
          if (len) {
            stack = stack.slice(0, -1 * len * 2);
            vstack = vstack.slice(0, -1 * len);
            lstack = lstack.slice(0, -1 * len);
          }

          stack.push(this.productions_[action[1]][0]);  // push nonterminal (reduce)
          vstack.push(yyval.$);
          lstack.push(yyval._$);
          // goto new state = table[STATE][NONTERMINAL]
          newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
          stack.push(newState);
          break;

        case 3:
          // accept
          return true;
      }

    }

    return true;
  }

  // Return the rule stack depth where the nearest error rule can be found.
// Return FALSE when no error recovery rule was found.
  locateNearestErrorRecoveryRule(state) {
    var stack = this.stack;
    var stack_probe = stack.length - 1;
    var depth = 0;

    // try to recover from error
    for (; ;) {
      // check for error recovery rule in this state
      if ((TERROR.toString()) in this.table[state]) {
        return depth;
      }
      if (state === 0 || stack_probe < 2) {
        return false; // No suitable error recovery rule available.
      }
      stack_probe -= 2; // popStack(1): [symbol, action]
      state = stack[stack_probe];
      ++depth;
    }
  }

  popStack(n) {
    this.stack.length = this.stack.length - 2 * n;
    this.vstack.length = this.vstack.length - n;
    this.lstack.length = this.lstack.length - n;
  }

  lex() {
    var token;
    token = this.lexer.lex() || EOF;
    // if token isn't its numeric value, convert
    if (typeof token !== 'number') {
      token = this.symbols_[token] || token;
    }
    return token;
  }

  //TODO: implement
  /*parseError:
  null
,
  trace:
  null
,
  warn:
  null
,
  error:
  null*/
}