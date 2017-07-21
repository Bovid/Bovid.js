export default class NonTerminal {
  constructor(symbol) {
    this.symbol = symbol;
    this.productions = [];
    this.first = [];
    this.follows = [];
    this.nullable = false;
  }

  toString(){
    var str = `${this.symbol}\n`;
    str += (this.nullable ? 'nullable' : 'not nullable');
    str += `\nFirsts: ${this.first.join(', ')}`;
    str += `\nFollows: ${this.first.join(', ')}`;
    str += `\nProductions:\n ${this.productions.join('\n  ')}`;
    return str;
  }
}