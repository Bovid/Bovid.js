export default class ParseLocation {
  constructor(firstLine, lastLine, firstColumn, lastColumn) {
    this.firstLine = firstLine;
    this.lastLine = lastLine;
    this.firstColumn = firstColumn;
    this.lastColumn = lastColumn;
  }
}