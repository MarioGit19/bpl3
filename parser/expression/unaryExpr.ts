import type Token from "../../lexer/token";
import ExpressionType from "../expressionType";
import Expression from "./expr";

export default class UnaryExpr extends Expression {
  constructor(
    public operator: Token,
    public right: Expression,
  ) {
    super(ExpressionType.UnaryExpression);
  }

  toString(depth: number = 0): string {
    this.depth = depth;
    let output = this.getDepth();

    output += "[ Unary Expression ]\n";
    output += this.getDepth() + `Operator: ${this.operator}\n`;
    output += this.right.toString(this.depth + 1);
    output += this.getDepth() + `[/ Unary Expression ]\n`;
    return output;
  }

  log(depth: number = 0): void {
    console.log(this.toString(depth));
  }

  transpile(): string {
    return `(${this.operator}${this.right.transpile()})`;
  }
}
