import type Token from "../../lexer/token";
import ExpressionType from "../expressionType";
import Expression from "./expr";

export default class StringLiteralExpr extends Expression {
  constructor(
    public value: string,
    public token: Token,
  ) {
    super(ExpressionType.StringLiteralExpr);
  }

  toString(depth: number = 0): string {
    this.depth = depth;
    let output = this.getDepth();
    output += "[ StringLiteral ]\n";
    output += this.getDepth() + this.getDepth();
    output += `Value: "${this.value}"\n`;
    output += this.getDepth();
    output += "/[ StringLiteral ]\n";
    return output;
  }

  log(depth: number = 0): void {
    console.log(this.toString(depth));
  }

  transpile(): string {
    return `"${this.value}"`;
  }
}
