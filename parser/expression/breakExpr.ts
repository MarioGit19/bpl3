import type AsmGenerator from "../../transpiler/AsmGenerator";
import type Scope from "../../transpiler/Scope";
import ExpressionType from "../expressionType";
import Expression from "./expr";

export default class BreakExpr extends Expression {
  constructor() {
    super(ExpressionType.BreakExpression);
  }

  toString(depth: number = 0): string {
    this.depth = depth;
    let output = this.getDepth();
    output += "[ Break Expression ] /[ Break Expression ]\n";
    return output;
  }

  log(depth: number = 0): void {
    console.log(this.toString(depth));
  }

  transpile(gen: AsmGenerator, scope: Scope): void {
    const currentContext = scope.getCurrentContext("loop");
    if (!currentContext) {
      throw new Error("Break statement used outside of a loop");
    }

    if (currentContext.type === "loop") {
      gen.emit(`jmp ${currentContext.breakLabel}`, "break from loop");
    }
  }
}
