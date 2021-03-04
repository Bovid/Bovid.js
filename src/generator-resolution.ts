import { LRGeneratorItemSet } from "./lr-generator-item-set";
import { Production } from "./production";
import { GeneratorAction } from "./generator-action";

export class GeneratorResolution {
  production: Production;
  reduce: GeneratorAction;
  shift: GeneratorAction;
  state: string;
  token: string;
  msg: string = null;
  action: GeneratorAction = null;
  bydefault: boolean = null;

  constructor(production: Production, token: string, ) {
    this.production = production;
    this.token = token;
  }
}