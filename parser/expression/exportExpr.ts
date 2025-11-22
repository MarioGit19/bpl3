import type AsmGenerator from "../../transpiler/AsmGenerator";
import type Scope from "../../transpiler/Scope";
import ExpressionType from "../expressionType";
import Expression from "./expr";

export default class ExportExpr extends Expression {
  constructor(public methodName: string) {
    super(ExpressionType.ExportExpression);
  }

  public toString(depth: number = 0): string {
    this.depth = depth;
    let output = `${this.getDepth()}`;
    output += " [ Export Expression]\n";
    this.depth++;
    output += `${this.getDepth()} Method Name: ${this.methodName}\n`;
    this.depth--;
    output += `${this.getDepth()}`;
    output += "/[ Export Expression ]\n";
    return output;
  }

  log(depth: number = 0): void {
    console.log(this.toString(depth));
  }

  transpile(gen: AsmGenerator, scope: Scope): void {
    const funcLabel = scope.resolveFunction(this.methodName);
    if (!funcLabel) {
      throw new Error(
        `Exported method "${this.methodName}" is not defined in the current scope.`,
      );
    }
    gen.emit(`;; Export method: ${this.methodName}`);
    gen.emitGlobalDefinition(`${this.methodName} equ ${funcLabel}`);
    gen.emitGlobalDefinition(`global ${this.methodName}`);
  }
}
