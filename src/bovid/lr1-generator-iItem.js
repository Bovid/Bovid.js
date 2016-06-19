import LRGeneratorItem from './lr-generator-item';

export default class LR1GeneratorItem extends LRGeneratorItem {
  afterconstructor() {
    this.id = this.production.id+'a'+this.dotPosition+'a'+this.follows.sort().join(',');
  }

  eq(e) {
    return e.id === this.id;
  }
}
