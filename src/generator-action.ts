import { LRGeneratorCollection } from "./lr-generator-collection";
import { LRGeneratorItemSet } from "./lr-generator-item-set";
import { Production } from "./production";


export class GeneratorAction {
  isShift: boolean;
  isAccept: boolean;
  isReduce: boolean;
  isNonAssociative: boolean;

  constructor(
    public state: LRGeneratorCollection | Production | null
    ) {
  }

  get isEndOfProduction() {
    return this.state === null;
  }

  shift(): this {
    this.isShift = true;
    return this;
  }

  accept(): this {
    this.isAccept = true;
    return this;
  }

  reduce(): this {
    this.isReduce = true;
    return this;
  }

  nonAssociative(): this {
    this.isNonAssociative = true;
    return this;
  }
}