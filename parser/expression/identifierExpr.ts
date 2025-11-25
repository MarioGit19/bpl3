import type AsmGenerator from "../../transpiler/AsmGenerator";
import type Scope from "../../transpiler/Scope";
import ExpressionType from "../expressionType";
import Expression from "./expr";

export default class IdentifierExpr extends Expression {
  constructor(public name: string) {
    super(ExpressionType.IdentifierExpr);
  }

  toString(depth: number = 0): string {
    this.depth = depth;
    let output = this.getDepth();
    output += "[ Identifier ]\n";
    this.depth++;
    output += this.getDepth() + `Name: ${this.name}\n`;
    this.depth--;
    output += this.getDepth() + "/[ Identifier ]\n";
    return output;
  }

  log(depth: number = 0): void {
    console.log(this.toString(depth));
  }

  transpile(gen: AsmGenerator, scope: Scope): void {
    const symbol = scope.resolve(this.name);
    if (!symbol) {
      throw new Error(`Undefined identifier: ${this.name}`);
    }
    const context = scope.getCurrentContext("LHS");
    if (context) {
      gen.emit(
        `lea rax, [${symbol.type === "global" ? "rel " + symbol.offset : "rbp - " + symbol.offset}]`,
      );
    } else {
      gen.emit(
        `mov rax, [${symbol.type === "global" ? "rel " + symbol.offset : "rbp - " + symbol.offset}]`,
      );
    }
  }
}
