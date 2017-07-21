#!/usr/bin/env node
'use strict';

function getCommandlineOptions () {
  return require('nomnom')
    .script('bovid')
    .option('file', {
      flag : true,
      position : 0,
      help : 'file containing a grammar'
    })
    .option('lexfile', {
      flag : true,
      position : 1,
      help : 'file containing a lexical grammar'
    })
    .option('json', {
      abbr : 'j',
      flag : true,
      help : 'force bovid to expect a grammar in JSON format'
    })
    .option('outfile', {
      abbr : 'o',
      metavar : 'FILE',
      help : 'Filename and base module name of the generated parser'
    })
    .option('debug', {
      abbr : 't',
      flag : true,
      default:
      false,
      help : 'Debug mode'
    })
    .option('module-type', {
      abbr : 'm',
      default:
      'commonjs',
      metavar : 'TYPE',
      help : 'The type of module to generate (commonjs, amd, js)'
    })
    .option('parser-type', {
      abbr : 'p',
      default:
      'lalr',
      metavar : 'TYPE',
      help : 'The type of algorithm to use for the parser (lr0, slr, lalr, lr)'
    })
    .option('version', {
      abbr : 'V',
      flag : true,
      help : 'print version and exit',
      callback : () => {
        return require('../package.json').version;
      }
  })
    .parse();
}

export default function cli(opts) {
  opts = opts || {};
  // if an input file wasn't given, assume input on stdin
  if (opts.file) {
      processInputFile(opts);
  } else {
      processStdin();
  }
};

function processGrammar(raw, lex, opts) {
  let grammar,
    parser;
  if (!opts.json) {
    grammar = processGrammars(raw, lex, opts.json);
  }
  parser = generateParserString(opts, grammar);
  return parser;
}

function processInputFile(opts) {
  const fs = require('fs');
  const path = require('path');

  // getting raw files
  let lex;
  if (opts.lexfile) {
    lex = fs.readFileSync(path.normalize(opts.lexfile), 'utf8');
  }
  const raw = fs.readFileSync(path.normalize(opts.file), 'utf8');

  // making best guess at json mode
  opts.json = path.extname(opts.file) === '.json' || opts.json;

  // setting output file name and module name based on input file name
  // if they aren't specified.
  let name = path.basename((opts.outfile || opts.file));

  name = name.replace(/\..*$/g, '');

  opts.outfile = opts.outfile || (name + '.js');
  if (!opts.moduleName && name) {
    opts.moduleName = name.replace(/-\w/g,
      function (match) {
        return match.charAt(1).toUpperCase();
      });
  }

  const parser = processGrammar(raw, lex, opts);
  fs.writeFileSync(opts.outfile, parser);
}

function readin(cb) {
  let stdin = process.openStdin(),
    data = '';

  stdin.setEncoding('utf8');
  stdin.addListener('data', (chunk) => {
    data += chunk;
  });
  stdin.addListener('end', () => {
    cb(data);
  });
}

function processStdin () {
  readin(function (raw) {
    console.log(processGrammar(raw, null, opts));
  });
}

function generateParserString(opts, grammar) {
    opts = opts || {};
    const parser = require('./index');
    const settings = grammar.options || {};

    if (opts['parser-type']) {
        settings.type = opts['parser-type'];
    }
    settings.debug = opts.debug;
    if (!settings.moduleType) {
        settings.moduleType = opts['module-type'];
    }

    const generator = new parser.Generator(grammar, settings);
    return generator.generate(settings);
}

function processGrammars(file, lexFile, jsonMode) {
    lexFile = lexFile || false;
    jsonMode = jsonMode || false;
    const ebnfParser = require('ebnf-parser');
    const cjson = require('cjson');
    let grammar;
    try {
        if (jsonMode) {
            grammar = cjson.parse(file);
        } else {
            grammar = ebnfParser.parse(file);
        }
    } catch (e) {
        throw new Error('Could not parse parser grammar\nError: ' + e);
    }
    try {
        if (lexFile) {
            grammar.lex = require('lex-parser').parse(lexFile);
        }
    } catch (e) {
        throw new Error('Could not parse lex grammar\nError: ' + e);
    }
    return grammar;
}

if (cli === module) {
    cli(getCommandlineOptions());
}
