import type AsmGenerator from "../../transpiler/AsmGenerator";
import type Scope from "../../transpiler/Scope";
import ExpressionType from "../expressionType";
import Expression from "./expr";

export default class ImportExpr extends Expression {
  constructor(
    public moduleName: string,
    public importName: string[],
  ) {
    super(ExpressionType.ImportExpression);
  }

  public toString(depth: number = 0): string {
    this.depth = depth;
    let output = `${this.getDepth()}`;
    output += " [Import Expression]\n";
    this.depth++;
    output += `${this.getDepth()} Module Name: ${this.moduleName}\n`;
    output += `${this.getDepth()} Import Names: ${this.importName.join(", ")}\n`;
    this.depth--;
    output += `${this.getDepth()}`;
    output += "/[ Import Expression ]\n";
    return output;
  }

  log(depth: number = 0): void {
    console.log(this.toString(depth));
  }

  transpile(gen: AsmGenerator, scope: Scope): void {
    gen.emit(
      `;; Importing module: ${this.moduleName} with imports: ${this.importName.join(", ")}`,
    );
    gen.emitImportStatement("extern " + this.importName.join(", "));
    this.importName.forEach((importedFunction) => {
      scope.defineFunction(importedFunction, importedFunction);
    });
  }
}
