import { LRGeneratorItem } from "./lr-generator-item";
import { LRGeneratorItemSet } from "./lr-generator-item-set";

export class LRGeneratorCollection {
  has: { [state: string]: boolean };
  itemSetStates: LRGeneratorItemSet[];

  constructor(itemSetStates: LRGeneratorItemSet[]) {
    this.itemSetStates = itemSetStates.slice(0);
  }

  get length(): number {
    return this.itemSetStates.length;
  }

  get(index: number): LRGeneratorItemSet {
    return this.itemSetStates[index];
  }

  addItemSet(itemSet: LRGeneratorItemSet): number {
    const v = itemSet.valueOf();
    if (this.has[v]) return;
    this.has[v] = true;
    this.itemSetStates.push(itemSet);
  }

  hasItemSet(itemSet: LRGeneratorItemSet): boolean {
    return this.itemSetStates.indexOf(itemSet) !== -1;
  }

  indexOf(itemSet: LRGeneratorItemSet): number {
    return this.itemSetStates.indexOf(itemSet);
  }
}