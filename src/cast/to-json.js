import fs from 'fs';
import path from 'path';
import bnfParser from '../ebnf/parser';
import lexParser from '../lex/parser';

export default function toJson(argv) {
  if(argv.length === 1) return;

  const args = argv.slice(1);
  let bnf, lex;

  console.log(args);

  if (args.length) {
    bnf = fs.readFileSync(path.resolve(args[0]), 'utf8');
    if (args[1]) {
      console.log('???lex');
      lex = fs.readFileSync(path.resolve(args[1]), 'utf8');
    }

    console.log(convert(bnf, lex));
  } else {
    let read = false;
    input(function (bnf) {
      read = true;
      console.log(convert(bnf));
    });
  }
};

function convert(rawGrammar, lex) {
  const grammar = bnfParser.parse(rawGrammar);
  if (lex) grammar.lex = lexParser.parse(lex);

  // trick to reposition `bnf` after `lex` in serialized JSON
  grammar.bnf = grammar.bnf;

  return JSON.stringify(grammar, null, '  ');
}

function input(cb) {
  var stdin = process.openStdin(),
    data = '';

  stdin.setEncoding('utf8');
  stdin.addListener('data', function (chunk) {
    data += chunk;
  });
  stdin.addListener('end', function () {
    cb(data);
  });
}

if (require.main === module) {
  toJson(process.argv.slice(1));
}
