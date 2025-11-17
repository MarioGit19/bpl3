import ExpressionType from "../expressionType";
import Expression from "./expr";

export default class BlockExpr extends Expression {
  constructor(public expressions: Expression[]) {
    super(ExpressionType.BlockExpression);
  }

  toString(depth: number = 0): string {
    this.depth = depth;
    let output = this.getDepth() + "[ BlockExpr ]\n";
    for (const expr of this.expressions) {
      output += expr.toString(depth + 1);
    }
    output += this.getDepth() + "/[ BlockExpr ]\n";
    return output;
  }

  log(depth: number = 0): void {
    console.log(this.toString(depth));
  }

  transpile(): string {
    let output = `{\n`;
    for (const expr of this.expressions) {
      output += expr.transpile() + "\n";
    }
    output += `}`;
    return output;
  }
}
