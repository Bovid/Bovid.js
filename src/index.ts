import { version } from '../package.json';
import { LR0Generator } from './lr0-generator';
import { SLRGenerator } from './slr-generator';
import { LR1Generator } from './lr1-generator';
import { LLGenerator } from './ll-generator';
import { LALRGenerator } from './lalr-generator';

function generate(g, options) {
  let opt = {...g.options, ...options },
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

export {
  version,
  generate,
  LR0Generator,
  LALRGenerator,
  SLRGenerator,
  LR1Generator,
  LLGenerator
};
