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
    this.object.transpile(gen, scope);
    gen.emit("lea rbx, [rax]", "load address of object for member access");
    gen.emit("push rbx", "push object address onto stack");
    this.property.transpile(gen, scope);
    gen.emit("pop rbx", "pop object address into rbx");
    if (this.isIndexAccess) {
      gen.emit(
        "mov rax, [rbx + rax * 8]",
        "load value from object at computed index",
      );
    } else {
      // Assuming property is an identifier and we have a way to get its offset
      const propertyName = (this.property as IdentifierExpr).name; // Cast to any for simplicity
      const offset = 8; //scope.getPropertyOffset(propertyName);
      gen.emit(
        `mov rax, [rbx + ${offset}]`,
        `load value of property '${propertyName}' from object`,
      );
    }
  }
}
