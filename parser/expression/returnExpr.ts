import type AsmGenerator from "../../transpiler/AsmGenerator";
import type Scope from "../../transpiler/Scope";
import ExpressionType from "../expressionType";
import Expression from "./expr";

export default class ReturnExpr extends Expression {
  constructor(public value: Expression | null) {
    super(ExpressionType.ReturnExpression);
  }

  toString(depth: number = 0): string {
    this.depth = depth;
    let output = this.getDepth();
    output += "[ Return Expression ]\n";
    this.depth++;
    if (this.value) {
      output += this.getDepth();
      output += `Value:\n`;
      output += this.value.toString(this.depth + 1);
    } else {
      output += this.getDepth();
      output += `Value: null\n`;
    }
    this.depth--;
    output += this.getDepth();
    output += "/[ Return Expression ]\n";
    return output;
  }

  log(depth: number = 0): void {
    console.log(this.toString(depth));
  }

  transpile(gen: AsmGenerator, scope: Scope): void {
    const currentContext = scope.getCurrentContext("function");
    if (!currentContext) {
      throw new Error("Return statement used outside of a function.");
    }

    if (this.value) {
      this.value.transpile(gen, scope);
    } else {
      gen.emit("xor rax, rax", "Return void (0)");
    }

    if (currentContext.type === "function") {
      gen.emit(
        `jmp ${currentContext.endLabel}`,
        "Jump to function end for return",
      );
    }
  }
}
