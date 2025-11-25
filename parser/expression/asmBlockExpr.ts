import Token from "../../lexer/token";
import type AsmGenerator from "../../transpiler/AsmGenerator";
import type Scope from "../../transpiler/Scope";
import ExpressionType from "../expressionType";
import Expression from "./expr";

export class AsmBlockExpr extends Expression {
  constructor(code: Token[]) {
    super(ExpressionType.AsmBlockExpression);
    this.code = code;
    this.requiresSemicolon = false;
  }

  public code: Token[];

  toString(depth: number = 0): string {
    this.depth = depth;
    let output = this.getDepth();
    output += `[ AsmBlockExpr ] {\n`;
    this.depth++;
    output += this.code
      .map((token) => this.getDepth() + token.value)
      .join("\n");
    this.depth--;
    output += `\n${this.getDepth()}} @${this.code[this.code.length - 1]?.line ?? "EOF"}\n`;
    return output;
  }

  log(depth: number = 0): void {
    console.log(this.toString(depth));
  }

  transpile(gen: AsmGenerator, scope: Scope): void {
    // TODO: Add asm block transpilation to interpolate local variables into asm block
    let lastLine = -1;
    let line = "";
    for (const token of this.code) {
      if (token.line !== lastLine) {
        if (line.length > 0) {
          gen.emit(line.trim(), "inline assembly");
        }
        line = "";
        lastLine = token.line;
      }
      line += token.value + " ";
    }
    if (line.length > 0) {
      gen.emit(line.trim(), "inline assembly");
    }
  }
}
