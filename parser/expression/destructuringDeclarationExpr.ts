import Token from "../../lexer/token";
import type { IRGenerator } from "../../transpiler/ir/IRGenerator";
import Scope from "../../transpiler/Scope";
import ExpressionType from "../expressionType";
import BlockExpr from "./blockExpr";
import Expression from "./expr";
import type { VariableType } from "./variableDeclarationExpr";

export type DestructuringTarget = {
  name: string;
  type: VariableType | null;
};

export default class DestructuringDeclarationExpr extends Expression {
  constructor(
    public scope: "global" | "local",
    public isConst: boolean,
    public targets: DestructuringTarget[],
    public value: Expression,
    public desugaredBlock: BlockExpr,
    public startToken?: Token,
  ) {
    super(ExpressionType.DestructuringDeclaration);
    this.startToken = startToken;
  }

  toString(depth: number = 0): string {
    this.depth = depth;
    let output = this.getDepth();
    output += "[ DestructuringDeclaration ]\n";
    this.depth++;
    output += this.getDepth();
    output += `Scope: ${this.scope}\n`;
    output += this.getDepth();
    output += `Targets: ${this.targets.map((t) => t.name).join(", ")}\n`;
    output += this.value.toString(this.depth);
    return output;
  }

  toIR(gen: IRGenerator, scope: Scope): string {
    return this.desugaredBlock.toIR(gen, scope);
  }
}
