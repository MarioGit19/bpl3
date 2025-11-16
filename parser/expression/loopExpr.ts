import ExpressionType from "../expressionType";
import type BlockExpr from "./blockExpr";
import Expression from "./expr";

export default class LoopExpr extends Expression {
  constructor(public body: BlockExpr) {
    super(ExpressionType.LoopExpression);
  }

  toString(depth: number = 0): string {
    this.depth = depth;
    let output = this.getDepth();
    output += "[ LoopExpression ]\n";
    output += this.body.toString(this.depth + 1);
    output += this.getDepth();
    output += "/[ LoopExpression ]\n";
    return output;
  }

  log(depth: number = 0): void {
    console.log(this.toString(depth));
  }

  transpile(): string {
    let output = `while (true) {\n`;
    output += this.body.transpile();
    output += `}\n`;
    return output;
  }
}
