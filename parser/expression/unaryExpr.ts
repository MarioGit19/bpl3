import type Token from "../../lexer/token";
import TokenType from "../../lexer/tokenType";
import type AsmGenerator from "../../transpiler/AsmGenerator";
import type Scope from "../../transpiler/Scope";
import ExpressionType from "../expressionType";
import Expression from "./expr";

export default class UnaryExpr extends Expression {
  constructor(
    public operator: Token,
    public right: Expression,
  ) {
    super(ExpressionType.UnaryExpression);
  }

  toString(depth: number = 0): string {
    this.depth = depth;
    let output = this.getDepth();

    output += "[ Unary Expression ]\n";
    output += this.getDepth() + `Operator: ${this.operator}\n`;
    output += this.right.toString(this.depth + 1);
    output += this.getDepth() + `[/ Unary Expression ]\n`;
    return output;
  }

  log(depth: number = 0): void {
    console.log(this.toString(depth));
  }

  transpile(gen: AsmGenerator, scope: Scope): void {
    if (this.operator.type === TokenType.AMPERSAND) {
      scope.setCurrentContext({ type: "LHS" });
      this.right.transpile(gen, scope);
      scope.removeCurrentContext("LHS");
      return;
    }

    if (this.operator.type === TokenType.STAR) {
      const isLHS = scope.getCurrentContext("LHS");
      if (isLHS) scope.removeCurrentContext("LHS");

      this.right.transpile(gen, scope);

      if (isLHS) {
        scope.setCurrentContext({ type: "LHS" });
      } else {
        gen.emit("mov rax, [rax]", "dereference pointer");
      }
      return;
    }

    this.right.transpile(gen, scope);
    switch (this.operator.type) {
      case TokenType.MINUS:
        gen.emit("neg rax", "unary minus");
        break;
      case TokenType.PLUS:
        gen.emit("noop", "unary plus (no operation)");
        break;
      case TokenType.NOT:
        gen.emit("cmp rax, 0", "compare rax to 0 for logical NOT");
        gen.emit("sete al", "set al to 1 if zero, else 0");
        gen.emit("movzx rax, al", "zero-extend al to rax");
        break;
      case TokenType.TILDE:
        gen.emit("not rax", "bitwise NOT");
        break;
      default:
        throw new Error(`Unsupported unary operator: ${this.operator.value}`);
    }
  }
}
