import JSONSelect from 'JSONSelect';
import esprima from 'esprima';
import escodegen from 'escodegen';

import { LookAhead } from './lookahead';
import { LRGeneratorItem } from './lr-generator-item';
import { LRGeneratorItemSet } from './lr-generator-item-set';
import { LRGeneratorCollection } from './lr-generator-collection';
import { LRTable } from './lr-table';
import { State } from './state';
import { GeneratorResolution } from './generator-resolution';
import { Production } from './production';
import { GeneratorAction } from './generator-action';
import { GeneratorOperator } from './generator-operator';

export interface ILRGeneratorOptions {
  noDefaultResolve?: boolean;
  moduleName?: string;
  moduleMain?: string;
}

export abstract class LRGenerator extends LookAhead {
  options: ILRGeneratorOptions;
  NONASSOC = 0;
  DEBUG = false;
  EOF: string;
  symbols_: { [symbol: string]: string };
  states: LRGeneratorCollection;
  table: LRTable;
  defaultActions: any;
  operators: { [symbol: string]: GeneratorOperator };
  Item: typeof LRGeneratorItem = LRGeneratorItem;
  ItemSet: typeof LRGeneratorItemSet = LRGeneratorItemSet;

  // Function that extends an object with the given value for all given keys
  // e.g., o([1, 3, 4], [6, 7], { x: 1, y: 2 }) = { 1: [6, 7]; 3: [6, 7], 4: [6, 7], x: 1, y: 2 }
  createObjectCode = 'o=function(k,v,o,l){' +
      'for(o=o||{},l=k.length;l--;o[k[l]]=v);' +
      'return o}';

    /*
     * Mixin for common LR parser behavior
     * */
  buildTable() {
    this.states = this.canonicalCollection();
    this.table = this.parseTable(this.states);
    this.defaultActions = this.findDefaults(this.table);
  }

  // find states with only one action, a reduction
  findDefaults(states) {
    var defaults = {};
    states.forEach((state, k) => {
      var i = 0;
      for (var act in state) {
        if ({}.hasOwnProperty.call(state, act)) i++;
      }

      if (i === 1 && state[act][0] === 2) {
        // only one action in state and it's a reduction
        defaults[k] = state[act];
      }
    });

    return defaults;
  }

  closureOperation(itemSet /*, closureSet*/): LRGeneratorItemSet {
    const closureSet = new LRGeneratorItemSet(),
      syms = {};

    let itemQueue, _set = itemSet;

    do {
      itemQueue = [];
      closureSet.concat(_set);
      _set.forEach((item) => {
        const symbol = item.markedSymbol;

        // if token is a non-terminal, recursively add closures
        if (symbol && this.nonTerminals[symbol]) {
          if(!syms[symbol]) {
            this.nonTerminals[symbol].productions.forEach((production) => {
              const newItem = new this.Item(production, 0);
              if(!closureSet.contains(newItem))
                itemQueue.push(newItem);
            });
            syms[symbol] = true;
          }
        } else if (!symbol) {
          // reduction
          closureSet.reductions.push(item);
          closureSet.inadequate = closureSet.reductions.length > 1 || closureSet.shifts;
        } else {
          // shift
          closureSet.shifts = true;
          closureSet.inadequate = closureSet.reductions.length > 0;
        }
      });

      _set = itemQueue;

    } while (!itemQueue.isEmpty());

    return closureSet;
  }

  goToOperation(itemSet: LRGeneratorItemSet, symbol: string): LRGeneratorItemSet {
    let gotoSet = new this.ItemSet();

    itemSet.forEach((item, n) => {
      if (item.markedSymbol === symbol) {
        gotoSet.push(new this.Item(item.production, item.dotPosition+1, item.follows, n));
      }
    });

    return gotoSet.isEmpty() ? gotoSet : this.closureOperation(gotoSet);
  }

  /* Create unique set of item sets
   * */
  canonicalCollection(): LRGeneratorCollection {
    const item1 = new LRGeneratorItem(this.productions[0], 0, [this.EOF]),
      firstState = this.closureOperation(new LRGeneratorItemSet([item1])),
      states = new LRGeneratorCollection([firstState]);
    let marked = 0,
      itemSet: LRGeneratorItemSet;

    // states.has = {};
    // states.has[firstState] = 0;

    while (marked !== states.length) {
      itemSet = states.get(marked); marked++;
      itemSet.forEach((item) => {
        if (item.markedSymbol && item.markedSymbol !== this.EOF) {
          this.canonicalCollectionInsert(item.markedSymbol, itemSet, states, marked-1);
        }
      });
    }

    return states;
  }

    // Pushes a unique state into the que. Some parsing algorithms may perform additional operations
  canonicalCollectionInsert(symbol: string, itemSet: LRGeneratorItemSet, states: LRGeneratorCollection, stateNum: number): void {
    const goToItemSet: LRGeneratorItemSet = this.goToOperation(itemSet, symbol);
    // add goToItemSet to que if not empty or duplicate
    if (!goToItemSet.isEmpty()) {
      states.addItemSet(goToItemSet);
      itemSet.addEdge(symbol, states); // store goto transition for table
      states.addItemSet(goToItemSet);
      goToItemSet.addPredecessor(symbol, itemSet)
    }
  }

  parseTable(itemSets: LRGeneratorCollection): LRTable {
    if (typeof this.debugCB === 'function') {
      this.debugCB('Building parse table.');
    }

    const table = new LRTable(),
        nonTerminals = this.nonTerminals,
        operators = this.operators,
        conflictedStates: State[] = [], // array of [state, token] tuples
        s = 1, // shift
        r = 2, // reduce
        a = 3; // accept

    // for each item set
    for (let k = 0; k < itemSets.length; k++) {
      const itemSet = itemSets.get(k);
      const state = new State(k, itemSet);
      table.addState(k, state);
      
      let action: GeneratorAction,
        stackSymbol: string;

      // set shift and goto actions
      for (stackSymbol in itemSet.edges) {
        itemSet.forEach((item, j) => {
          // find shift and goto actions
          if (item.markedSymbol == stackSymbol) {
            const gotoState = itemSet.getEdge(stackSymbol);
            if (nonTerminals[stackSymbol]) {
              // store state to go to after a reduce
              //this.trace(k, stackSymbol, 'g'+gotoState);
              state[this.symbols_[stackSymbol]] = new GeneratorAction(gotoState);
            } else {
              //this.trace(k, stackSymbol, 's'+gotoState);
              state[this.symbols_[stackSymbol]] = new GeneratorAction(gotoState).shift();
            }
          }
        });
      }

      // set accept action
      itemSet.forEach((item, j) => {
        if (item.markedSymbol == this.EOF) {
          // accept
          state[this.symbols_[this.EOF]] = new GeneratorAction(null).accept();
          //this.trace(k, this.EOF, state[this.EOF]);
        }
      });

      var allterms = this.lookAheads ? false : this.terminals;

      // set reductions and resolve potential conflicts
      itemSet.reductions.forEach((item, j) => {
        // if parser uses lookahead, only enumerate those terminals
        const terminals = allterms || this.lookAheads(itemSet, item);

        terminals.forEach((stackSymbol) => {
          action = state[this.symbols_[stackSymbol]];
          const operator = operators[stackSymbol];

          // Reading a terminal and current position is at the end of a production, try to reduce
          if (action.isEndOfProduction) {
            const resolution = this.resolveConflict(
              item.production,
              stackSymbol,
              operator,
              new GeneratorAction(item.production).reduce(),
              action
            );
            this.resolutions.push(resolution);
            if (resolution.bydefault) {
              this.conflicts++;
              if (!this.DEBUG) {
                this.warn('Conflict in grammar: multiple actions possible when lookahead token is ',stackSymbol,' in state ',k, "\n- ", printAction(resolution.reduce, this), "\n- ", printAction(resolution.shift, this));
                conflictedStates.push(state);
              }
              if (this.options.noDefaultResolve) {
                action = resolution.reduce.reduce();
              }
            } else {
              action = resolution.action;
            }
          } else {
            action = new GeneratorAction(item.production).reduce();
          }
          if (action.state) {
            state[this.symbols_[stackSymbol]] = action;
          } else if (action.isNonAssociative) {
            state[this.symbols_[stackSymbol]] = undefined;
          }
        });
      });
    }

    if (!this.DEBUG && this.conflicts > 0) {
      this.warn("\nStates with conflicts:");
      conflictedStates.forEach((state) => {
        this.warn(`State ${state.stateIndex}`);
        this.warn('  ', state.itemSet.join("\n  "));
      });
    }

    if (typeof this.debugCB === 'function') {
      if (this.conflicts > 0) {
        this.resolutions.forEach((resolution, i) => {
          if (resolution.bydefault) {
            // this.warn('Conflict at state: ',resolution.state, ', token: ',resolution[1], "\n  ", printAction(resolution.reduce, this), "\n  ", printAction(resolution.shift, this));
            this.warn(`Conflict at state: ${resolution.state}
  token: ${resolution.token}
    ${printAction(resolution.reduce, this)}
    ${printAction(resolution.shift, this)}`);
          }
        });
        this.trace("\n"+this.conflicts+" Conflict(s) found in grammar.");
      }
      this.trace("Done.");
    }

    return table;
  }

  // resolves shift-reduce and reduce-reduce conflicts
  resolveConflict(
    production: Production,
    stackSymbol: string,
    operator: GeneratorOperator,
    reduce: GeneratorAction,
    shift: GeneratorAction
  ) {
    const resolution = new GeneratorResolution(production, stackSymbol),
      s = 1, // shift
      r = 2, // reduce
      a = 3; // accept

    if (shift.isReduce) {
      resolution.msg = "Resolve R/R conflict (use first production declared in grammar.)";
      resolution.action = (shift.state as Production).id < (reduce.state as Production).id ? shift : reduce;
      if (shift.state !== reduce.state) {
        resolution.bydefault = true;
      }
      return resolution;
    }

    if (production.precedence === 0 || !operator) {
      resolution.msg = "Resolve S/R conflict (shift by default.)";
      resolution.bydefault = true;
      resolution.action = shift.shift();
    } else if (production.precedence < operator.precedence ) {
      resolution.msg = "Resolve S/R conflict (shift for higher precedent operator.)";
      resolution.action = shift.shift();
    } else if (production.precedence === operator.precedence) {
      if (operator.assoc === "right" ) {
        resolution.msg = "Resolve S/R conflict (shift for right associative operator.)";
        resolution.action = shift.shift();
      } else if (operator.assoc === "left" ) {
        resolution.msg = "Resolve S/R conflict (reduce for left associative operator.)";
        resolution.action = reduce.reduce();
      } else if (operator.assoc === "nonassoc" ) {
        resolution.msg = "Resolve S/R conflict (no action for non-associative operator.)";
        resolution.action = new GeneratorAction(null).nonAssociative();
      }
    } else {
      resolution.msg = "Resolve conflict (reduce for higher precedent production.)";
      resolution.action = reduce.reduce();
    }

    return resolution;
  }

  generateAMDModule(opt?: ILRGeneratorOptions){
    opt = { ...this.options, ...opt };
    const module = this.generateModule_();
    const out = `
define(function(require) {
  ${module.commonCode}
  var parser = ${module.moduleCode};
  ${this.moduleInclude}
  ${
    this.lexer && this.lexer.generateModule
      ? `${this.lexer.generateModule()};parser.lexer = lexer;`
      : ''
  }
  return parser;
});`
    return out;
  }

  generateCommonJSModule(opt?: ILRGeneratorOptions) {
    opt = { ...this.options, ...opt };
    var moduleName = opt.moduleName || 'parser';
    var out = `this.generateModule(opt);

if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
  exports.parser = ${moduleName};
  exports.Parser = ${moduleName}.Parser;
  exports.parse = function () { return ${moduleName}.parse.apply(${moduleName}, arguments); };
  exports.main = ${String(opt.moduleMain || commonjsMain)};
  if (typeof module !== 'undefined' && require.main === module) {
    exports.main(process.argv.slice(1));
  }
}`;

    return out;
  }

  generateModule(opt) {
    opt = Object.assign({}, this.options, opt);
    var moduleName = opt.moduleName || "parser";
    var out = "/* parser generated by bovid " + version + " */\n"
        + "/*\n"
        + "  Returns a Parser object of the following structure:\n"
        + "\n"
        + "  Parser: {\n"
        + "  yy: {}\n"
        + "  }\n"
        + "\n"
        + "  Parser.prototype: {\n"
        + "  yy: {},\n"
        + "  trace: function(),\n"
        + "  symbols_: {associative list: name ==> number},\n"
        + "  terminals_: {associative list: number ==> name},\n"
        + "  productions_: [...],\n"
        + "  performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$),\n"
        + "  table: [...],\n"
        + "  defaultActions: {...},\n"
        + "  parseError: function(str, hash),\n"
        + "  parse: function(input),\n"
        + "\n"
        + "  lexer: {\n"
        + "    EOF: 1,\n"
        + "    parseError: function(str, hash),\n"
        + "    setInput: function(input),\n"
        + "    input: function(),\n"
        + "    unput: function(str),\n"
        + "    more: function(),\n"
        + "    less: function(n),\n"
        + "    pastInput: function(),\n"
        + "    upcomingInput: function(),\n"
        + "    showPosition: function(),\n"
        + "    test_match: function(regex_match_array, rule_index),\n"
        + "    next: function(),\n"
        + "    lex: function(),\n"
        + "    begin: function(condition),\n"
        + "    popState: function(),\n"
        + "    _currentRules: function(),\n"
        + "    topState: function(),\n"
        + "    pushState: function(condition),\n"
        + "\n"
        + "    options: {\n"
        + "      ranges: boolean       (optional: true ==> token location info will include a .range[] member)\n"
        + "      flex: boolean       (optional: true ==> flex-like lexing behaviour where the rules are tested exhaustively to find the longest match)\n"
        + "      backtrack_lexer: boolean  (optional: true ==> lexer regexes are tested in order and for each matching regex the action code is invoked; the lexer terminates the scan when a token is returned by the action code)\n"
        + "    },\n"
        + "\n"
        + "    performAction: function(yy, yy_, $avoiding_name_collisions, YY_START),\n"
        + "    rules: [...],\n"
        + "    conditions: {associative list: name ==> set},\n"
        + "  }\n"
        + "  }\n"
        + "\n"
        + "\n"
        + "  token location info (@$, _$, etc.): {\n"
        + "  first_line: n,\n"
        + "  last_line: n,\n"
        + "  first_column: n,\n"
        + "  last_column: n,\n"
        + "  range: [start_number, end_number]     (where the numbers are indexes into the input string, regular zero-based)\n"
        + "  }\n"
        + "\n"
        + "\n"
        + "  the parseError function receives a 'hash' object with these members for lexer and parser errors: {\n"
        + "  text:    (matched text)\n"
        + "  token:     (the produced terminal token, if any)\n"
        + "  line:    (yylineno)\n"
        + "  }\n"
        + "  while parser (grammar) errors will also provide these members, i.e. parser errors deliver a superset of attributes: {\n"
        + "  loc:     (yylloc)\n"
        + "  expected:  (string describing the set of expected tokens)\n"
        + "  recoverable: (boolean: TRUE when the parser has a error recovery rule available for this particular error)\n"
        + "  }\n"
        + "*/\n";
    out += (moduleName.match(/\./) ? moduleName : "var "+moduleName) +
        " = " + this.generateModuleExpr();

    return out;
  }

  generateModuleExpr() {
    var out = '';
    var module = this.generateModule_();

    out += "(function(){\n";
    out += module.commonCode;
    out += "\nvar parser = "+module.moduleCode;
    out += "\n"+this.moduleInclude;
    if (this.lexer && this.lexer.generateModule) {
      out += this.lexer.generateModule();
      out += "\nparser.lexer = lexer;";
    }
    var inputReader = fs.readFileSync(path.join(__dirname, 'util', 'InputReader.js'), "utf8");

    out += "\nfunction Parser () {\n  this.yy = {};\n}"
        + "Parser.prototype = parser;\n\n"
        + inputReader
        + "\nparser.Parser = Parser;"
        + "\nreturn new Parser;\n})();";

    return out;
  }

  generate(opt: ILRGeneratorOptions) {
    opt = { ...this.options, ...opt };
    let code = "";

    // check for illegal identifier
    if (!opt.moduleName || !opt.moduleName.match(/^[A-Za-z_$][A-Za-z0-9_$]*$/)) {
      opt.moduleName = "parser";
    }
    switch (opt.moduleType) {
      case "js":
        code = this.generateModule(opt);
        break;
      case "amd":
        code = this.generateAMDModule(opt);
        break;
      default:
        code = this.generateCommonJSModule(opt);
        break;
    }

    return code;
  }

  // Generates the code of the parser module, which consists of two parts:
  // - module.commonCode: initialization code that should be placed before the module
  // - module.moduleCode: code that creates the module object
  generateModule_() {
    let parseFn = String(parser.parse);
    if (!this.hasErrorRecovery) {
      parseFn = this.removeErrorRecovery(parseFn);
    }

    if (this.options['token-stack']) {
      parseFn = this.addTokenStack(parseFn);
    }

    // Generate code with fresh variable names
    nextVariableId = 0;
    var tableCode = this.generateTableCode(this.table);

    // Generate the initialization code
    var commonCode = tableCode.commonCode;

    // Generate the module creation code
    var moduleCode = "{";
    moduleCode += [
      "trace: " + String(this.trace || parser.trace),
      "yy: {}",
      "symbols_: " + JSON.stringify(this.symbols_),
      "terminals_: " + JSON.stringify(this.terminals_).replace(/"([0-9]+)":/g,"$1:"),
      "productions_: " + JSON.stringify(this.productions_),
      "performAction: " + String(this.performAction),
      "table: " + tableCode.moduleCode,
      "defaultActions: " + JSON.stringify(this.defaultActions).replace(/"([0-9]+)":/g,"$1:"),
      "parseError: " + String(this.parseError || (this.hasErrorRecovery ? traceParseError : parser.parseError)),
      "parse: " + parseFn
    ].join(",\n");
    moduleCode += "};";

    return { commonCode: commonCode, moduleCode: moduleCode }
  }

  // returns parse function without error recovery code
  static removeErrorRecovery(fn) {
    var parseFn = fn;
    try {
      var ast = esprima.parse(parseFn);

      var labeled = JSONSelect.match(':has(:root > .label > .name:val("_handle_error"))', ast);
      var reduced_code = labeled[0].body.consequent.body[3].consequent.body;
      reduced_code[0] = labeled[0].body.consequent.body[1];   // remove the line: error_rule_depth = locateNearestErrorRecoveryRule(state);
      reduced_code[4].expression.arguments[1].properties.pop(); // remove the line: 'recoverable: error_rule_depth !== false'
      labeled[0].body.consequent.body = reduced_code;

      return escodegen.generate(ast)
          .replace(/_handle_error:\s?/,"")
          .replace(/\\\\n/g,"\\n");
    } catch (e) {
      return parseFn;
    }
  }

  addTokenStack(fn) {
    var parseFn = fn;
    try {
      var ast = esprima.parse(parseFn);
      var stackAst = esprima.parse(String(this.tokenStackLex)).body[0];
      stackAst.id.name = 'lex';

      var labeled = JSONSelect.match(':has(:root > .label > .name:val("_token_stack"))', ast);

      labeled[0].body = stackAst;

      return escodegen.generate(ast)
          .replace(/_token_stack:\s?/,"")
          .replace(/\\\\n/g,"\\n");
    } catch (e) {
      return parseFn;
    }
  }


  // lex function that supports token stacks
  tokenStackLex() {
    var token;
    token = tstack.pop() || lexer.lex() || EOF;
    // if token isn't its numeric value, convert
    if (typeof token !== 'number') {
      if (token instanceof Array) {
        tstack = token;
        token = tstack.pop();
      }
      token = this.symbols_[token] || token;
    }
    return token;
  }

  // Generate code that represents the specified parser table
  generateTableCode(table) {
    var moduleCode = JSON.stringify(table);
    var variables = [this.createObjectCode];

    // Don't surround numerical property name numbers in quotes
    moduleCode = moduleCode.replace(/"([0-9]+)"(?=:)/g, "$1");

    // Replace objects with several identical values by function calls
    // e.g., { 1: [6, 7]; 3: [6, 7], 4: [6, 7], 5: 8 } = o([1, 3, 4], [6, 7], { 5: 8 })
    moduleCode = moduleCode.replace(/\{\d+:[^\}]+,\d+:[^\}]+\}/g, function (object) {
      // Find the value that occurs with the highest number of keys
      var value, frequentValue, key, keys = {}, keyCount, maxKeyCount = 0,
          keyValue, keyValues = [], keyValueMatcher = /(\d+):([^:]+)(?=,\d+:|\})/g;

      while ((keyValue = keyValueMatcher.exec(object))) {
        // For each value, store the keys where that value occurs
        key = keyValue[1];
        value = keyValue[2];
        keyCount = 1;

        if (!(value in keys)) {
          keys[value] = [key];
        } else {
          keyCount = keys[value].push(key);
        }
        // Remember this value if it is the most frequent one
        if (keyCount > maxKeyCount) {
          maxKeyCount = keyCount;
          frequentValue = value;
        }
      }
      // Construct the object with a function call if the most frequent value occurs multiple times
      if (maxKeyCount > 1) {
        // Collect all non-frequent values into a remainder object
        for (value in keys) {
          if (value !== frequentValue) {
            for (var k = keys[value], i = 0, l = k.length; i < l; i++) {
              keyValues.push(k[i] + ':' + value);
            }
          }
        }
        const keyValuesString = keyValues.length ? ',{' + keyValues.join(',') + '}' : '';
        // Create the function call `o(keys, value, remainder)`
        object = 'o([' + keys[frequentValue].join(',') + '],' + frequentValue + keyValuesString + ')';
      }
      return object;
    });

    // Count occurrences of number lists
    var list;
    var lists = {};
    var listMatcher = /\[[0-9,]+\]/g;

    while (list = listMatcher.exec(moduleCode)) {
      lists[list] = (lists[list] || 0) + 1;
    }

    // Replace frequently occurring number lists with variables
    moduleCode = moduleCode.replace(listMatcher, function (list) {
      var listId = lists[list];
      // If listId is a number, it represents the list's occurrence frequency
      if (typeof listId === 'number') {
        // If the list does not occur frequently, represent it by the list
        if (listId === 1) {
          lists[list] = listId = list;
          // If the list occurs frequently, represent it by a newly assigned variable
        } else {
          lists[list] = listId = this.createVariable();
          variables.push(listId + '=' + list);
        }
      }
      return listId;
    });

    // Return the variable initialization code and the table code
    return {
      commonCode: 'var ' + variables.join(',') + ';',
      moduleCode: moduleCode
    };
  }

  nextVariableId = 0;
  variableTokens = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$';
  variableTokensLength = this.variableTokens.length;
  // Creates a variable with a unique name
  createVariable() {
    let id = this.nextVariableId++;
    let name = '$V';

    do {
      name += this.variableTokens[id % this.variableTokensLength];
      id = ~~(id / this.variableTokensLength);
    } while (id !== 0);

    return name;
  }

  createParser() {
    const p = eval(this.generateModuleExpr());

    // for debugging
    p.productions = this.productions;

    function bind(method) {
      return () => {
        this.lexer = p.lexer;
        return this[method].apply(this, arguments);
      };
    }

    // backwards compatability
    p.generate = bind('generate');
    p.generateAMDModule = bind('generateAMDModule');
    p.generateModule = bind('generateModule');
    p.generateCommonJSModule = bind('generateCommonJSModule');

    return p;
  }

  warn(...parts: string[]) {
    console.log(parts.join(''));
  }
}

function printAction(a: GeneratorAction, gen) {
  var s = a.isShift ? 'shift token (then go to state ' + a[1] + ')' :
      a[0] == 2 ? 'reduce by rule: ' + gen.productions[a[1]] :
                  'accept' ;

  return s;
}