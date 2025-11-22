import type AsmGenerator from "../../transpiler/AsmGenerator";
import type Scope from "../../transpiler/Scope";
import ExpressionType from "../expressionType";
import Expression from "./expr";

export default class ContinueExpr extends Expression {
  constructor() {
    super(ExpressionType.ContinueExpression);
  }

  toString(depth: number = 0): string {
    this.depth = depth;
    let output = this.getDepth();
    output += "[ Continue Expression ] /[ Continue Expression ]\n";
    return output;
  }

  log(depth: number = 0): void {
    console.log(this.toString(depth));
  }

  transpile(gen: AsmGenerator, scope: Scope): void {
    const currentContext = scope.getCurrentContext("loop");
    if (!currentContext) {
      throw new Error("Continue statement used outside of a loop");
    }

    if (currentContext.type === "loop") {
      gen.emit(`jmp ${currentContext.continueLabel}`, "continue loop");
    }
  }
}
