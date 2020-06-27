export default class ParseLocation {
  firstLine: number;
  lastLine: number;
  firstColumn: number;
  lastColumn: number;
  range: [number, number];

  constructor(firstLine, lastLine, firstColumn, lastColumn) {
    this.firstLine = firstLine;
    this.lastLine = lastLine;
    this.firstColumn = firstColumn;
    this.lastColumn = lastColumn;
    this.range = null;
  }
}