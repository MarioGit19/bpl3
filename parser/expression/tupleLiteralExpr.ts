import type { IRGenerator } from "../../transpiler/ir/IRGenerator";
import type Scope from "../../transpiler/Scope";
import ExpressionType from "../expressionType";
import Expression from "./expr";
import Token from "../../lexer/token";
import { CompilerError } from "../../errors";
import { resolveExpressionType } from "../../utils/typeResolver";
import type { VariableType } from "./variableDeclarationExpr";

export default class TupleLiteralExpr extends Expression {
  constructor(
    public elements: Expression[],
    token: Token,
  ) {
    super(ExpressionType.TupleLiteralExpr);
    this.startToken = token;
  }

  toString(depth: number = 0): string {
    this.depth = depth;
    let output = this.getDepth();
    output += "[ TupleLiteral ]\n";
    this.depth++;
    output += this.getDepth() + `Elements (${this.elements.length}):\n`;
    this.depth++;
    for (let i = 0; i < this.elements.length; i++) {
      output += this.getDepth() + `[${i}]:\n`;
      output += this.elements[i]!.toString(this.depth + 1);
    }
    this.depth--;
    this.depth--;
    output += this.getDepth() + "/[ TupleLiteral ]\n";
    return output;
  }

  optimize(): Expression {
    this.elements = this.elements.map((e) => e.optimize());
    return this;
  }

  toIR(gen: IRGenerator, scope: Scope): string {
    if (this.elements.length === 0) {
      throw new CompilerError(
        "Empty tuples are not supported",
        this.startToken?.line || 0,
      );
    }

    // Evaluate all element expressions and get their types
    const elementRegs: string[] = [];
    const elementTypes: VariableType[] = [];

    for (const elem of this.elements) {
      const reg = elem.toIR(gen, scope);
      elementRegs.push(reg);

      const elemType = resolveExpressionType(elem, scope);
      if (!elemType) {
        throw new CompilerError(
          "Cannot infer tuple element type",
          this.startToken?.line || 0,
        );
      }
      elementTypes.push(elemType);
    }

    // Create tuple type
    const tupleType: VariableType = {
      name: "tuple",
      isPointer: 0,
      isArray: [],
      tupleElements: elementTypes,
    };

    // Get LLVM IR type for the tuple
    const irType = gen.getIRType(tupleType);

    // Allocate tuple on stack, store elements, then load it
    const tuplePtr = gen.emitAlloca(irType, "tuple");

    // Store each element using GEP
    for (let i = 0; i < elementRegs.length; i++) {
      const elemPtr = gen.emitGEP(irType, tuplePtr, [
        { value: "0", type: "i32" },
        { value: i.toString(), type: "i32" },
      ]);
      gen.emitStore(gen.getIRType(elementTypes[i]!), elementRegs[i]!, elemPtr);
    }

    // Load the complete tuple value
    const resultReg = gen.emitLoad(irType, tuplePtr);
    return resultReg;
  }
}
