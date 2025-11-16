import type Token from "../../lexer/token";
import ExpressionType from "../expressionType";
import Expression from "./expr";

export default class VariableDeclarationExpr extends Expression {
  constructor(
    public scope: "global" | "local",
    public isConst: boolean,
    public name: string,
    public varType: Token,
    public value: Expression | null,
  ) {
    super(ExpressionType.VariableDeclaration);
  }

  toString(depth: number = 0): string {
    this.depth = depth;
    let output = this.getDepth();
    output += "[ VariableDeclaration ]\n";
    this.depth++;
    output += this.getDepth() + this.getDepth();
    output += `Scope: ${this.scope}\n`;
    output += this.getDepth() + this.getDepth();
    output += `IsConst: ${this.isConst}\n`;
    output += this.getDepth() + this.getDepth();
    output += `Name: ${this.name}\n`;
    output += this.getDepth() + this.getDepth();
    output += `Type: ${this.varType.value}\n`;
    if (this.value) {
      output += this.getDepth() + this.getDepth();
      output += `Value:\n`;
      output += this.value.toString(this.depth + 1);
    } else {
      output += this.getDepth() + this.getDepth();
      output += `Value: uninitialized\n`;
    }
    this.depth--;
    output += this.getDepth();
    output += "/[ VariableDeclaration ]\n";
    return output;
  }

  log(depth: number = 0): void {
    console.log(this.toString(depth));
  }

  transpile(): string {
    let output = "";
    if (this.scope === "global") {
      output += "var ";
    } else {
      output += this.isConst ? "const " : "let ";
    }
    output += `${this.name}`;
    if (this.value) {
      output += ` = ${this.value.transpile()}`;
    }
    output += `;\n`;
    return output;
  }
}
