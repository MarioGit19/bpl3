import { Logger } from "../../utils/Logger";
import type { IRGenerator } from "../../transpiler/ir/IRGenerator";
import type Scope from "../../transpiler/Scope";
import Token from "../../lexer/token";
import ExpressionType from "../expressionType";
import { CompilerError } from "../../errors";

import type { VariableType } from "./variableDeclarationExpr";
export default class Expression {
  constructor(type: ExpressionType) {
    this.type = type;
  }
  public type: ExpressionType;
  public depth: number = 0;
  public requiresSemicolon: boolean = true;
  public startToken?: Token;
  public endToken?: Token;
  public contextScope?: Scope;
  public _analyzed?: boolean;
  public monomorphizedName?: string;

  toString(depth: number = 0): string {
    throw new CompilerError(
      "Method toString not implemented.",
      this.startToken?.line || 0,
    );
  }

  log(depth: number = 0): void {
    Logger.log(this.toString(depth));
  }

  toIR(gen: IRGenerator, scope: Scope): string {
    Logger.log("Method not implemented for:", this.constructor.name);
    throw new CompilerError(
      `Method toIR not implemented for ${this.constructor.name}`,
      this.startToken?.line || 0,
    );
  }

  getAddress(gen: IRGenerator, scope: Scope): string {
    throw new CompilerError(
      "Expression is not an l-value (cannot take address or assign to it).",
      this.startToken?.line || 0,
    );
  }

  optimize(): Expression {
    return this;
  }

  getDepth(): string {
    return " ".repeat(this.depth * 2);
  }

  printType(type: VariableType): string {
    let output = "";
    output += "Type: " + type.name;
    if (type.genericArgs && type.genericArgs.length > 0) {
      output +=
        "<" + type.genericArgs.map((t) => this.printType(t)).join(", ") + ">";
    }
    output +=
      ", IsPointer: " +
      (type.isPointer === 1 ? "true" : type.isPointer || "false");
    output +=
      ", IsArray: " +
      (type.isArray.length ? `[${type.isArray.join("][")}]` : "false");
    return output;
  }
}
