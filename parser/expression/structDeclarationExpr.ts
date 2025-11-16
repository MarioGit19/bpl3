import type Token from "../../lexer/token";
import ExpressionType from "../expressionType";
import Expression from "./expr";

export type StructField = {
  name: string;
  type: Token;
  isArray: number; // number of dimensions, 0 means not an array
  isPointer: number; // number of pointer levels, 0 means not a pointer
};

export default class StructDeclarationExpr extends Expression {
  constructor(
    public name: string,
    public fields: StructField[],
  ) {
    super(ExpressionType.StructureDeclaration);
  }

  toString(depth: number = 0): string {
    this.depth = depth;
    let output = this.getDepth();
    output += "[ StructDeclaration ]\n";
    this.depth++;
    output += this.getDepth() + this.getDepth();
    output += `Name: ${this.name}\n`;
    output += this.getDepth() + this.getDepth();
    output += `Fields:\n`;
    for (const field of this.fields) {
      output += this.getDepth() + this.getDepth() + this.getDepth();
      output += `- Name: ${field.name}, Type: ${field.type.value}, IsArray: ${field.isArray === 1 ? "true" : field.isArray || "false"}, IsPointer: ${field.isPointer === 1 ? "true" : field.isPointer || "false"}\n`;
    }
    this.depth--;
    output += this.getDepth();
    output += "/[ StructDeclaration ]\n";
    return output;
  }

  log(depth: number = 0): void {
    console.log(this.toString(depth));
  }

  transpile(): string {
    let output = `struct ${this.name} {\n`;
    for (const field of this.fields) {
      output += `  ${field.type.value} `;
      output += field.name;
      for (let i = 0; i < field.isPointer; i++) {
        output += "*";
      }
      for (let i = 0; i < field.isArray; i++) {
        output += "[]";
      }
      output += ";\n";
    }
    output += `};\n`;
    return output;
  }
}
