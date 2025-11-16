import ExpressionType from "../expressionType";
import type BlockExpr from "./blockExpr";
import Expression from "./expr";

export default class IfExpr extends Expression {
  constructor(
    public condition: Expression,
    public thenBranch: BlockExpr,
    public elseBranch: BlockExpr | null,
  ) {
    super(ExpressionType.IfExpression);
    this.requiresSemicolon = false;
  }

  toString(depth: number = 0): string {
    this.depth = depth;
    let output = this.getDepth() + "[ IfExpr ]\n";
    this.depth++;
    output += this.getDepth() + " Condition:\n";
    output += this.condition.toString(depth + 1);
    output += this.getDepth() + " Then Branch:\n";
    output += this.thenBranch.toString(depth + 1);
    if (this.elseBranch) {
      output += this.getDepth() + " Else Branch:\n";
      output += this.elseBranch.toString(depth + 1);
    }

    this.depth--;
    output += this.getDepth() + "/[ IfExpr ]\n";
    return output;
  }

  log(depth: number = 0): void {
    console.log(this.toString(depth));
  }

  transpile(): string {
    let output = `if (${this.condition.transpile()}) {\n`;
    output += this.thenBranch.transpile();
    output += `\n}`;
    if (this.elseBranch) {
      output += ` else {\n`;
      output += this.elseBranch.transpile();
      output += `\n}`;
    }
    return output;
  }
}
