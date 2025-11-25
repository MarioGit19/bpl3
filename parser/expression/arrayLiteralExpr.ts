import type AsmGenerator from "../../transpiler/AsmGenerator";
import type Scope from "../../transpiler/Scope";
import ExpressionType from "../expressionType";
import Expression from "./expr";

export default class ArrayLiteralExpr extends Expression {
  constructor(public elements: Expression[]) {
    super(ExpressionType.ArrayLiteralExpr);
  }

  toString(depth: number = 0): string {
    this.depth = depth;
    let output = this.getDepth();
    output += "[ ArrayLiteral ]\n";
    this.depth++;
    output += this.getDepth() + `Elements:\n`;
    this.depth++;
    for (const element of this.elements) {
      output += element.toString(this.depth);
    }
    this.depth--;
    this.depth--;
    output += this.getDepth() + "/[ ArrayLiteral ]\n";
    return output;
  }

  log(depth: number = 0): void {
    console.log(this.toString(depth));
  }

  transpile(gen: AsmGenerator, scope: Scope): void {
    for (let i = this.elements.length - 1; i >= 0; i--) {
      this.elements[i]!.transpile(gen, scope);
      gen.emit("push rax", "Pushing array element onto stack");
      scope.stackOffset += 8;
    }
    gen.emit("mov rax, rsp", "Setting rax to point to start of array literal");
  }
}
