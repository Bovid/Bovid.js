import { LRGeneratorItemSet } from "./lr-generator-item-set";
import { GeneratorAction } from "./generator-action";

export class State {
  constructor(
    public stateIndex: number,
    public itemSet: LRGeneratorItemSet) {
  }
}