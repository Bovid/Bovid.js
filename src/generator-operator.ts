export class GeneratorOperator {
  constructor(
    public precedence: number,
    public assoc: "right" | "left" | "nonassoc"
  ) {

  }
}