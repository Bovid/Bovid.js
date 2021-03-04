import fs from 'fs';
import path from 'path';

function convert(grammar, options): string {
  options = options || {};
  let s = '';

  s += generateDeclarations(grammar);
  s += generateBNF(grammar.bnf, options);

  return s;
}

function generateDeclarations(grammar): string {
  let s = '',
    key;

  for (key in grammar) if (grammar.hasOwnProperty(key)) {
    switch (key) {
      case 'start':
        s += `\n%start ${ grammar.start }\n\n`;
        break;
      case 'author':
        s += `\n/* author: ${ grammar.author } */\n\n`;
        break;
      case 'comment':
        s += `\n/* description: ${ grammar.comment } */\n\n`;
        break;
      case 'lex':
        s += `%lex\n${ generateLex(grammar.lex) }/lex\n\n`;
        break;
      case 'operators':
        for (let i = 0; i < grammar.operators.length; i++) {
          s += `%${ grammar.operators[i][0] } ${ quoteSymbols(grammar.operators[i].slice(1).join(' ')) }\n`;
        }
        s += '\n';
        break;
      default:
        throw new Error(`unknown declaration ${ key }`);
    }
  }

  return s;
}

function generateBNF(bnf, options): string {
  let s = '%%\n';

  for (let sym in bnf) {
    if (!bnf.hasOwnProperty(sym)) continue;
    s += `\n ${ sym }\n    : ${ generateHandles(bnf[sym], options) }\n    ;\n`;
  }

  return s;
}

function generateHandles(handle: string | string[] | string[][], options): string {
  if (typeof handle === 'string') {
    return handle;
  } else { //array
    let s = '';
    for (let i = 0; i < handle.length; i++) {
      if (typeof handle[i] === 'string' && handle[i]) {
        s += quoteSymbols(handle[i]);
      } else if (handle[i] instanceof Array) {
        s += (handle[i][0] && quoteSymbols(handle[i][0]));
        if (typeof handle[i][1] === 'string') {
          if (handle[i][2] && handle[i][2].prec) {
            s += ` %prec `+handle[i][2].prec;
          }
          if (!options.stripActions) {
            s += `\n        {`+handle[i][1]+`}`;
          }
        } else if (handle[i][1].prec) {
          s += ` %prec `+handle[i][1].prec;
        }
      }
      if (typeof handle[i+1] !== 'undefined')
        s += `\n    | `;
    }
    return s;
  }
}

function quoteSymbols(rhs): string {
  rhs = rhs.split(' ');

  for (let i = 0; i < rhs.length; i++) {
    rhs[i] = quoteSymbol(rhs[i]);
  }
  return rhs.join(' ');
}

function quoteSymbol(sym): string {
  if (!/[a-zA-Z][a-zA-Z0-9_\-]*/.test(sym)) {
    var quote = /'/.test(sym) ? '"' : "'";
    sym = quote+sym+quote;
  }
  return sym;
}


// Generate lex format from lex JSON

function generateLex(lex): string {
  const s = [], indent = 28;

  if ('macros' in lex) {
    for (let macro in lex.macros) {
      s.push(macro, new Array(indent - macro.length+1).join(' '),lex.macros[macro], '\n');
    }
  }
  if ('startConditions' in lex) {
    const ps = [],
      px = [];
    for (let st in lex.startConditions) {
      if (lex.startConditions[st])
        px.push(st);
      else
        ps.push(st);
    }
    if (ps.length) s.push('%s ', ps.join(' '));
    if (px.length) s.push('%x ', px.join(' '));
  }
  if ('actionInclude' in lex) {
    s.push('\n%{\n', lex.actionInclude, '\n%}\n');
  }
  s.push('\n%%\n');

  const longestRule = lex.rules.reduce(function (prev, curr) { return prev > curr[0].length ? prev : curr[0].length; }, 0);
  if ('rules' in lex) {
    for (let rule; rule = lex.rules.shift();) {
      if (rule.length > 2) s.push('<'+rule.shift().join(',')+'>');
      const reg = generateLexRegex(rule[0]);
      s.push(reg, new Array(longestRule-reg.length+5).join(' '), genLexRule(rule[1]), '\n');
    }
  }
  s.push('\n');

  return s.join('');
}

function generateLexRegex(regex: string): string {
  var matcher = regex.replace(/^([a-zA-Z0-9]+)\\b$/, "\"$1\"")
    .replace(/\\([.*+?^${}()|\[\]\/\\])/g,"$1")
    .replace(/^\$$/,"<<EOF>>")
    .replace(/^([.*+?^${}()|\[\]\/\\\-;=,><!@#%&]+)$/,"\"$1\"");
  return matcher;
}

function genLexRule(rule: string): RegExpMatchArray | string {
  return rule.match(/\n/) ? '%{'+rule+'%}' : rule;
}

export function toEBNF(args): string {
  if(args.length <= 2) return;

  const raw = fs.readFileSync(path.resolve(args[2]), 'utf8'),
    name = path.basename(args[2], '.json'),
    grammar = JSON.parse(raw);

  if ('bnf' in grammar || 'lex' in grammar) {
    fs.writeFileSync(path.resolve(name+'.jison'), convert(grammar));
  }
};


if (typeof process !== 'undefined' || require.main === module) {
  toEBNF(process.argv);
}
