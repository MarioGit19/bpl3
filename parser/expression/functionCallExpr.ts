import ExpressionType from "../expressionType";
import Expression from "./expr";

export default class FunctionCallExpr extends Expression {
  constructor(
    public functionName: string,
    public args: Expression[],
  ) {
    super(ExpressionType.FunctionCall);
  }

  toString(depth: number = 0): string {
    this.depth = depth;
    let output = this.getDepth() + `[ FunctionCall: ${this.functionName} ]\n`;
    this.depth++;
    for (const arg of this.args) {
      output += arg.toString(depth + 1);
    }
    this.depth--;
    output += this.getDepth() + `/[ FunctionCall ]\n`;
    return output;
  }

  log(depth: number = 0): void {
    console.log(this.toString(depth));
  }

  transpile(): string {
    let output = `${this.functionName}(`;
    const argOutputs: string[] = [];
    for (const arg of this.args) {
      argOutputs.push(arg.transpile());
    }
    output += argOutputs.join(", ");
    output += `)`;
    return output;
  }
}
