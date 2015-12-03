// Bovid, an LR(0), SLR(1), LARL(1), LR(1) Parser Generator, forked from Jison
// Zachary Carter <zach@carter.name>
// MIT X Licensed

var fs      = require('fs')
  , path    = require('path')
  , version = require('../package.json').version
  , print
  ;

// detect print
if (typeof console === 'object' && typeof console.log === 'function') {
  print = console.log;
} else if (typeof puts !== 'undefined') {
  print = function print () { puts([].join.call(arguments, ' ')); };
} else if (typeof print !== 'undefined') {
  print = print;
} else {
  print = function print () {};
}

// default main method for generated commonjs modules
function commonjsMain (args) {
  if (!args[1]) {
    console.log('Usage: '+args[0]+' FILE');
    process.exit(1);
  }
  var source = require('fs').readFileSync(require('path').normalize(args[1]), "utf8");
  return exports.parser.parse(source);
}

function generate(g, options) {
  var opt = Object.assign({}, g.options, options)
    , generator
    ;
  switch (opt.type) {
    case 'lr0':
      generator = new LR0Generator(g, opt);
      break;
    case 'slr':
      generator = new SLRGenerator(g, opt);
      break;
    case 'lr':
      generator = new LR1Generator(g, opt);
      break;
    case 'll':
      generator = new LLGenerator(g, opt);
      break;
    default:
      generator = new LALRGenerator(g, opt);
  }

  return generator.createParser();
}

module.exports = {
  version: version,
  generate: generate,
  LR0Generator: LR0Generator,
  LALRGenerator: LALRGenerator,
  SLRGenerator: SLRGenerator,
  LR1Generator: LR1Generator,
  LLGenerator: LLGenerator
};