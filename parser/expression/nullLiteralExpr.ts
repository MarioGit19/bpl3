import ExpressionType from "../expressionType";
import Expression from "./expr";

export default class NullLiteral extends Expression {
  constructor() {
    super(ExpressionType.NullLiteralExpr);
  }

  toString(depth: number = 0): string {
    this.depth = depth;
    return this.getDepth() + `[ NullLiteral ] NULL /[ NullLiteral ]\n`;
  }

  log(depth: number = 0): void {
    console.log(this.toString(depth));
  }

  transpile(): string {
    return "0";
  }
}
