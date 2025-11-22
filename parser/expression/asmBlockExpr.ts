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
    const lines = [];
    let line = "";
    let prevLineNum = this.code[0]?.line ?? 0;
    this.code.forEach((token) => {
      if (token.line !== prevLineNum) {
        lines.push(line);
        line = token.value;
        prevLineNum = token.line;
      } else {
        if (line.length > 0) {
          line += " ";
        }
        line += token.value;
      }
    });
    if (line.length > 0) {
      lines.push(line);
    }
    gen.emit("", "begin asm block");
    lines.forEach((asmLine) => {
      gen.emit(asmLine, "raw asm code");
    });
    gen.emit("", "end asm block");
  }
}
