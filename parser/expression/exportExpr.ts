import type Scope from "../../transpiler/Scope";
import type { IRGenerator } from "../../transpiler/ir/IRGenerator";
import ExpressionType from "../expressionType";
import Expression from "./expr";
import Token from "../../lexer/token";

export default class ExportExpr extends Expression {
  constructor(
    public exportName: string,
    public exportType: "type" | "function" = "function",
    public nameToken?: Token,
  ) {
    super(ExpressionType.ExportExpression);
  }

  public toString(depth: number = 0): string {
    this.depth = depth;
    let output = `${this.getDepth()}`;
    output += " [ Export Expression]\n";
    this.depth++;
    output += `${this.getDepth()} Export Name: ${this.exportName}\n`;
    output += `${this.getDepth()} Type: ${this.exportType}\n`;
    this.depth--;
    output += `${this.getDepth()}`;
    output += "/[ Export Expression ]\n";
    return output;
  }

  log(depth: number = 0): void {
    console.log(this.toString(depth));
  }

  toIR(gen: IRGenerator, scope: Scope): string {
    if (this.exportType === "type") {
      const type = scope.resolveType(this.exportName);
      if (!type) {
        throw new Error(`Exporting undefined type: ${this.exportName}`);
      }
      return "";
    }

    const func = scope.resolveFunction(this.exportName);
    if (!func) {
      throw new Error(`Exporting undefined function: ${this.exportName}`);
    }
    return "";
  }
}
