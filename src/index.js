import fs from 'fs';
import path from 'path';
import { version } from '../package.json';
import LR0Generator from './lr0-generator';
import SLRGenerator from './slr-generator';
import LR1Generator from './lr1-generator';
import LLGenerator from './ll-generator';
import LALRGenerator from './lalr-generator';

let print;

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
function commonjsMain(args) {
  if (!args[1]) {
    console.log('Usage: '+args[0]+' FILE');
    process.exit(1);
  }
  let source = fs.readFileSync(path.normalize(args[1]), 'utf8');
  return exports.parser.parse(source);
}

function generate(g, options) {
  let opt = Object.assign({}, g.options, options),
    generator;

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

export default {
  version,
  generate,
  LR0Generator,
  LALRGenerator,
  SLRGenerator,
  LR1Generator,
  LLGenerator
};
