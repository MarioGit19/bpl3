import type AsmGenerator from "../../transpiler/AsmGenerator";
import type Scope from "../../transpiler/Scope";
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

  transpile(gen: AsmGenerator, scope: Scope): void {
    if (this.args.length > this.argOrders.length) {
      throw new Error(
        `Function calls with more than ${this.argOrders.length} arguments are not supported.`,
      );
    }

    const funcInfo = scope.resolveFunction(this.functionName);
    if (!funcInfo) {
      throw new Error(`Undefined function: ${this.functionName}`);
    }

    gen.emit("", `func_call ${this.functionName}`);

    this.args.forEach((arg, index) => {
      arg.transpile(gen, scope);
      gen.emit("push rax", `Push argument ${index + 1} onto stack`);
    });

    for (let i = this.args.length - 1; i >= 0; i--) {
      gen.emit(
        `pop ${this.argOrders[i]}`,
        `Move argument ${i + 1} into ${this.argOrders[i]}`,
      );
    }

    gen.emit(`call ${funcInfo}`, "call_instr");
  }
}
