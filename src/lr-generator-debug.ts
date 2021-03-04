import { LRGenerator } from './lr-generator';

export class LRGeneratorDebug extends LRGenerator {
  beforeparseTable() {

  }

  afterparseTable() {

  }

  aftercanonicalCollection(states) {
    var trace = this.trace;
    trace("\nItem sets\n------");

    states.forEach(function (state, i) {
      trace("\nitem set",i,"\n"+state.join("\n"), '\ntransitions -> ', JSON.stringify(state.edges));
    });
  }

  printAction(a, gen) {
    var s = a[0] == 1 ? 'shift token (then go to state '+a[1]+')' :
        a[0] == 2 ? 'reduce by rule: '+gen.productions[a[1]] :
            'accept' ;
    return s;
  }
}