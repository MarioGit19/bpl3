import type Token from "../../lexer/token";
import ExpressionType from "../expressionType";
import Expression from "./expr";

export type FunctionArgument = {
  name: string;
  type: Token;
  isArray: number; // number of dimensions, 0 means not an array
  isPointer: number; // number of pointer levels, 0 means not a pointer
};

export default class FunctionDeclarationExpr extends Expression {
  constructor(
    public name: string,
    public args: FunctionArgument[],
    public returnType: FunctionArgument | null,
    public body: Expression,
  ) {
    super(ExpressionType.FunctionDeclaration);
    this.requiresSemicolon = false;
  }

  toString(depth: number = 0): string {
    this.depth = depth;
    let output = this.getDepth();
    output += "[ FunctionDeclaration ]\n";
    this.depth++;
    output += this.getDepth() + `Name: ${this.name}\n`;
    output += this.getDepth() + `Arguments:\n`;
    this.depth++;
    for (const arg of this.args) {
      output +=
        this.getDepth() +
        `Name: ${arg.name}, Type: ${arg.type.value}, IsArray: ${arg.isArray}, IsPointer: ${arg.isPointer}\n`;
    }
    this.depth--;
    if (this.returnType) {
      // TODO: improve return type representation
      output +=
        this.getDepth() + `Return Type: ${this.returnType.type.value}\n`;
    } else {
      output += this.getDepth() + `Return Type: void\n`;
    }
    output += this.getDepth() + `Body:\n`;
    output += this.body.toString(this.depth + 1) + "\n";
    this.depth--;
    output += this.getDepth() + `/[ FunctionDeclaration ]\n`;

    return output;
  }

  log(depth: number = 0): void {
    console.log(this.toString(depth));
  }

  transpile(): string {
    let output = `function ${this.name}(`;
    const argsOutput: string[] = [];
    for (const arg of this.args) {
      let argStr = arg.name + ": " + arg.type.value;
      for (let i = 0; i < arg.isPointer; i++) {
        argStr = "Pointer<" + argStr + ">";
      }
      for (let i = 0; i < arg.isArray; i++) {
        argStr += "[]";
      }
      argsOutput.push(argStr);
    }
    output += argsOutput.join(", ");
    output += ")";
    if (this.returnType) {
      // TODO: improve return type representation
      output += ": " + this.returnType.type.value;
    }
    output += " {\n";
    output += this.body.transpile() + "\n";
    output += "}";
    return output;
  }
}
