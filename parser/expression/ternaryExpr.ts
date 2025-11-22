import type AsmGenerator from "../../transpiler/AsmGenerator";
import type Scope from "../../transpiler/Scope";
import ExpressionType from "../expressionType";
import Expression from "./expr";

export default class TernaryExpr extends Expression {
  constructor(
    public condition: Expression,
    public trueExpr: Expression,
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

  transpile(gen: AsmGenerator, scope: Scope): void {
    const label = gen.generateLabel("ternary_");
    const condLabel = label + "_cond";
    const thenLabel = label + "_then";
    const elseLabel = label + "_else";
    const endLabel = label + "_end";

    gen.emitLabel(condLabel);
    this.condition.transpile(gen, scope);
    gen.emit("cmp rax, 0", "compare condition to zero");
    gen.emit(`je ${elseLabel}`, "jump to else if condition is false");
    gen.emitLabel(thenLabel);
    this.trueExpr.transpile(gen, scope);
    gen.emit(`jmp ${endLabel}`, "jump to end of ternary expression");
    gen.emitLabel(elseLabel);
    this.falseExpr.transpile(gen, scope);
    gen.emitLabel(endLabel);
  }
}
