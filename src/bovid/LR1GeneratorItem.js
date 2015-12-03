class LR1GeneratorItem extends LRGeneratorItem {
  afterconstructor() {
    this.id = this.production.id+'a'+this.dotPosition+'a'+this.follows.sort().join(',');
  }

  eq(e) {
    return e.id === this.id;
  }
}