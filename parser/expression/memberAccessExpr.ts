import type AsmGenerator from "../../transpiler/AsmGenerator";
import type Scope from "../../transpiler/Scope";
import ExpressionType from "../expressionType";
import Expression from "./expr";
import type IdentifierExpr from "./identifierExpr";

export default class MemberAccessExpr extends Expression {
  constructor(
    public object: Expression,
    public property: Expression, // since it can be identifier or expression (for index access)
    public isIndexAccess: boolean,
  ) {
    super(ExpressionType.MemberAccessExpression);
  }

  toString(depth: number = 0): string {
    this.depth = depth;
    let output = this.getDepth();
    output += "[ MemberAccess ]\n";
    this.depth++;
    output += this.object.toString(this.depth + 1);
    output +=
      this.getDepth() + `Property: \n${this.property.toString(this.depth + 1)}`;
    output += this.getDepth() + `IsIndexAccess: ${this.isIndexAccess}\n`;
    this.depth--;
    output += this.getDepth() + "/[ MemberAccess ]\n";
    return output;
  }

  log(depth: number = 0): void {
    console.log(this.toString(depth));
  }

  transpile(gen: AsmGenerator, scope: Scope): void {
    const isLHS = scope.getCurrentContext("LHS");
    if (isLHS) scope.removeCurrentContext("LHS");

    this.object.transpile(gen, scope);
    gen.emit("push rax", "MEMBER ACCESS EXPR - save base address");
    scope.stackOffset += 8;

    if (this.isIndexAccess) {
      // Index access logic
      this.property.transpile(gen, scope);
      gen.emit("pop rbx", "MEMBER ACCESS EXPR - restore base address");
      scope.stackOffset -= 8;

      // Calculate address: rbx + rax * elementSize
      const elementSize = 8; // Assuming 8 bytes for simplicity (u64)
      gen.emit(`imul rax, ${elementSize}`, "MEMBER ACCESS EXPR - scale index");
      gen.emit("add rax, rbx", "MEMBER ACCESS EXPR - calculate address");
    } else {
      gen.emit("pop rbx", "MEMBER ACCESS EXPR - restore base address");
      scope.stackOffset -= 8;
      throw new Error("Struct member access not implemented yet");
    }

    if (!isLHS) {
      gen.emit("mov rax, [rax]", "MEMBER ACCESS EXPR - dereference if RHS");
    } else {
      scope.setCurrentContext({ type: "LHS" });
    }
  }
}
