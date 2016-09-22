// Encodes Jison formatted grammars as JSON
import fs from 'fs';
import path from 'path';

var fs = require('fs');
var path = require('path');
var bnfParser = require('ebnf-parser');
var lexParser = require('lex-parser');

exports.main = function (argv) {
  if(argv.length == 1) return;

  var args = argv.slice(1);
  var bnf, lex;

  console.log(args);

  if (args.length) {
    bnf = fs.readFileSync(path.resolve(args[0]), 'utf8');
    if (args[1]) {
      console.log('???lex');
      lex = fs.readFileSync(path.resolve(args[1]), 'utf8');
    }

    console.log(processGrammar(bnf, lex));
  } else {
    var read = false;
    input(function (bnf) {
      read = true;
      console.log(processGrammar(bnf));
    });
  }
};

exports.convert = processGrammar;

function processGrammar (rawGrammar, lex) {
  var grammar = bnfParser.parse(rawGrammar);
  if (lex) grammar.lex = lexParser.parse(lex);

  // trick to reposition `bnf` after `lex` in serialized JSON
  grammar.bnf = grammar.bnf;

  return JSON.stringify(grammar, null, '  ');
}

function input (cb) {
  var stdin = process.openStdin(),
    data = '';

  stdin.setEncoding('utf8');
  stdin.addListener('data', function (chunk) {
    data += chunk;
  });
  stdin.addListener('end', function () {
    cb(data);
  });
};

if (require.main === module)
  exports.main(process.argv.slice(1));
