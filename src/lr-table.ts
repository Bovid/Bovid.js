import { State } from "./state";

export class LRTable {
  states: {
    [index: number]: State;
  } = {};
  
  addState(index: number, state: State): void {
    this.states[index] = state;
  }
}