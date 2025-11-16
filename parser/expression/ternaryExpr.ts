import ExpressionType from "../expressionType";
import Expression from "./expr";

export default class TernaryExpr extends Expression {
  constructor(
    public condition: Expression,
    public trueExpr: Expression | null,
    public falseExpr: Expression,
  ) {
    super(ExpressionType.TernaryExpression);
  }

  toString(depth: number = 0): string {
    this.depth = depth;
    let output = this.getDepth();
    output += "[ Ternary Expression ]\n";
    output += this.condition.toString(this.depth + 1);
    output +=
      this.trueExpr?.toString(this.depth + 1) ??
      this.getDepth() + this.getDepth() + "null\n";
    output += this.falseExpr.toString(this.depth + 1);
    output += this.getDepth();
    output += "/[ Ternary Expression ]\n";
    return output;
  }

  log(depth: number = 0): void {
    console.log(this.toString(depth));
  }

  transpile(): string {
    return `${this.condition.transpile()} ? ${this.trueExpr?.transpile() ?? "null"} : ${this.falseExpr.transpile()}`;
  }
}
