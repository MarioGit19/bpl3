import type AsmGenerator from "../../transpiler/AsmGenerator";
import HelperGenerator from "../../transpiler/HelperGenerator";
import type Scope from "../../transpiler/Scope";
import ExpressionType from "../expressionType";
import Expression from "./expr";

export default class ProgramExpr extends Expression {
  public constructor() {
    super(ExpressionType.Program);
  }

  expressions: Expression[] = [];

  public addExpression(expr: Expression): void {
    this.expressions.push(expr);
  }

  public toString(depth: number = 0): string {
    this.depth = depth;
    let output = this.getDepth();
    output += "[ Program ]\n";
    for (const expr of this.expressions) {
      output += expr.toString(this.depth + 1);
    }
    output += this.getDepth() + "/[ Program ]\n";
    return output;
  }

  public log(depth: number = 0): void {
    console.log(this.toString(depth));
  }

  transpile(gen: AsmGenerator, scope: Scope): void {
    const weHaveExportStmt = this.expressions.find(
      (expr) => expr.type === ExpressionType.ExportExpression,
    );
    HelperGenerator.generateBaseTypes(gen, scope);
    HelperGenerator.generateHelperFunctions(gen, scope);
    if (!weHaveExportStmt) {
      gen.emitGlobalDefinition("global _start");
      gen.emitLabel("_start");
      gen.emit("call _precompute", "call precompute function");
      gen.emit("push rbp", "standard function prologue");
      gen.emit("mov rbp, rsp", "standard function prologue");
      gen.emit("sub rsp, 8", "align stack to 16 bytes");
      gen.emit("call main", "call main function");
      gen.emit("add rsp, 8", "realign stack");
      gen.emit("pop rbp", "standard function epilogue");
      gen.emit("mov rdi, rax", "move return value into rdi for exit");
      gen.emit("call exit", "call exit function");
      gen.emit("", "end of _start");
    } else {
      gen.emit("call _precompute", "call precompute function");
    }

    for (const expr of this.expressions) {
      expr.transpile(gen, scope);
    }
  }
}
