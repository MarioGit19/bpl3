import Token from "../../lexer/token";
import type { IRGenerator } from "../../transpiler/ir/IRGenerator";
import Scope from "../../transpiler/Scope";
import ExpressionType from "../expressionType";
import BlockExpr from "./blockExpr";
import Expression from "./expr";

export default class DestructuringAssignmentExpr extends Expression {
  public desugaredBlock?: BlockExpr;

  constructor(
    public targets: Expression[],
    public value: Expression,
    token: Token,
  ) {
    super(ExpressionType.DestructuringAssignment);
    this.startToken = token;
  }

  toString(depth: number = 0): string {
    this.depth = depth;
    let output = this.getDepth();
    output += "[ DestructuringAssignment ]\n";
    this.depth++;
    output += this.getDepth();
    output += `Targets: ${this.targets.length}\n`;
    output += this.value.toString(this.depth);
    return output;
  }

  toIR(gen: IRGenerator, scope: Scope): string {
    if (!this.desugaredBlock) {
      throw new Error(
        "DestructuringAssignmentExpr must be analyzed before code generation",
      );
    }
    return this.desugaredBlock.toIR(gen, scope);
  }
}
