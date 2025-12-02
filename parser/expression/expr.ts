import type { IRGenerator } from "../../transpiler/ir/IRGenerator";
import type Scope from "../../transpiler/Scope";
import ExpressionType from "../expressionType";
import type { VariableType } from "./variableDeclarationExpr";
import Token from "../../lexer/token";

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

  public argOrders: string[] = ["rdi", "rsi", "rdx", "rcx", "r8", "r9"];

  toString(depth: number = 0): string {
    throw new Error("Method not implemented.");
  }

  log(depth: number = 0): void {
    throw new Error("Method not implemented.");
  }

  toIR(gen: IRGenerator, scope: Scope): string {
    console.log("Method not implemented for:", this.constructor.name);
    throw new Error("Method not implemented.");
  }

  getAddress(gen: IRGenerator, scope: Scope): string {
    throw new Error(
      "Method not implemented. This expression is not an l-value.",
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
