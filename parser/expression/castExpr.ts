import type { IRGenerator } from "../../transpiler/ir/IRGenerator";
import Scope from "../../transpiler/Scope";
import { CompilerError } from "../../errors";
import { SemanticAnalyzer } from "../../transpiler/analysis/SemanticAnalyzer";
import ExpressionType from "../expressionType";
import Expression from "./expr";
import IdentifierExpr from "./identifierExpr";
import NumberLiteralExpr from "./numberLiteralExpr";
import StructLiteralExpr from "./structLiteralExpr";

import type { VariableType } from "./variableDeclarationExpr";

export default class CastExpr extends Expression {
  constructor(
    public targetType: VariableType,
    public value: Expression,
  ) {
    super(ExpressionType.CastExpression);
    this.requiresSemicolon = false;
  }

  toString(depth: number = 0): string {
    this.depth = depth;
    let output = this.getDepth();
    output += "[ CastExpression ]\n";
    this.depth++;
    output +=
      this.getDepth() + `Target Type: ${this.printType(this.targetType)}\n`;
    output += this.getDepth() + `Value:\n`;
    output += this.value.toString(this.depth + 1);
    this.depth--;
    output += this.getDepth() + `/[ CastExpression ]\n`;
    return output;
  }

  optimize(): Expression {
    this.value = this.value.optimize();
    return this;
  }

  toIR(gen: IRGenerator, scope: Scope): string {
    if (this.value.type === ExpressionType.StructLiteralExpr) {
      const structLiteral = this.value as StructLiteralExpr;
      const irType = gen.getIRType(this.targetType);
      const ptr = gen.emitAlloca(irType);

      const typeInfo = scope.resolveType(this.targetType.name);
      if (!typeInfo)
        throw new CompilerError(
          "Unknown type " + this.targetType.name,
          this.startToken?.line || 0,
        );

      structLiteral.fields.forEach((field, index) => {
        let fieldName = field.fieldName;
        let fieldIndex = index;
        let fieldType: VariableType | undefined;

        if (fieldName) {
          let i = 0;
          for (const [name, member] of typeInfo.members) {
            if (name === fieldName) {
              fieldIndex = i;
              fieldType = {
                name: member.name,
                isPointer: member.isPointer,
                isArray: member.isArray,
              };
              break;
            }
            i++;
          }
        } else {
          let i = 0;
          for (const [name, member] of typeInfo.members) {
            if (i === index) {
              fieldType = {
                name: member.name,
                isPointer: member.isPointer,
                isArray: member.isArray,
              };
              break;
            }
            i++;
          }
        }

        if (!fieldType)
          throw new CompilerError(
            `Cannot resolve field ${fieldName || index} in ${this.targetType.name}`,
            this.startToken?.line || 0,
          );

        const fieldPtr = gen.emitGEP(gen.getIRType(this.targetType), ptr, [
          "0",
          fieldIndex.toString(),
        ]);
        const val = field.value.toIR(gen, scope);
        gen.emitStore(gen.getIRType(fieldType), val, fieldPtr);
      });

      return gen.emitLoad(irType, ptr);
    }

    const sourceValue = this.value.toIR(gen, scope);

    // We need a way to infer the type - import SemanticAnalyzer temporarily
    const analyzer = new SemanticAnalyzer();
    const sourceType = analyzer.inferType(this.value, scope);

    if (!sourceType) {
      throw new CompilerError(
        `Cannot infer type of cast source expression`,
        this.startToken?.line || 0,
      );
    }

    const targetIRType = gen.getIRType(this.targetType);
    const sourceIRType = gen.getIRType(sourceType);

    // If types are identical, no cast needed
    if (this.typesEqual(sourceType, this.targetType)) {
      return sourceValue;
    }

    // Determine appropriate cast instruction
    return this.emitCastInstruction(
      gen,
      sourceValue,
      sourceType,
      this.targetType,
      sourceIRType,
      targetIRType,
    );
  }

  private inferValueType(expr: Expression, scope: Scope): VariableType | null {
    // Delegate to SemanticAnalyzer's inferType logic
    // We'll need to import it or duplicate the logic
    // For now, use a simplified version
    const exprType = expr.type;

    if (exprType === ExpressionType.NumberLiteralExpr) {
      const numExpr = expr as NumberLiteralExpr;
      if (numExpr.value.includes(".")) {
        return { name: "f64", isPointer: 0, isArray: [] };
      }
      return { name: "u64", isPointer: 0, isArray: [] };
    }

    if (exprType === ExpressionType.IdentifierExpr) {
      const ident = expr as IdentifierExpr;
      const resolved = scope.resolve(ident.name);
      return resolved ? resolved.varType : null;
    }

    // Add more cases as needed
    return null;
  }

  private typesEqual(a: VariableType, b: VariableType): boolean {
    return (
      a.name === b.name &&
      a.isPointer === b.isPointer &&
      a.isArray.length === b.isArray.length
    );
  }

  private emitCastInstruction(
    gen: IRGenerator,
    sourceValue: string,
    sourceType: VariableType,
    targetType: VariableType,
    sourceIRType: any,
    targetIRType: any,
  ): string {
    return gen.emitTypeCast(
      sourceValue,
      sourceType,
      targetType,
      sourceIRType,
      targetIRType,
    );
  }
}
