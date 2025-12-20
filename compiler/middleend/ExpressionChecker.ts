/**
 * ExpressionChecker - Handles type checking of expressions
 * These methods are designed to be bound to a TypeChecker instance using .call()
 */

import * as AST from "../common/AST";
import { CompilerError, type SourceLocation } from "../common/CompilerError";
import { TokenType } from "../frontend/TokenType";
import type { Symbol, SymbolKind } from "./SymbolTable";
import { TypeUtils, INTEGER_TYPES, KNOWN_TYPES } from "./TypeUtils";
import { OPERATOR_METHOD_MAP } from "./OverloadResolver";
import type { TypeCheckerBase } from "./TypeCheckerBase";

/**
 * Type for the TypeChecker context that expression checkers need access to
 */
export interface ExpressionCheckerContext {
  currentScope: any;
  checkExpression(expr: AST.Expression): AST.TypeNode | undefined;
  resolveType(type: AST.TypeNode, checkConstraints?: boolean): AST.TypeNode;
  areTypesCompatible(
    t1: AST.TypeNode,
    t2: AST.TypeNode,
    checkConstraints?: boolean,
  ): boolean;
  typeToString(type: AST.TypeNode | undefined): string;
  substituteType(
    type: AST.TypeNode,
    map: Map<string, AST.TypeNode>,
  ): AST.TypeNode;
  isBoolType(type: AST.TypeNode): boolean;
  makeVoidType(): AST.TypeNode;
  isIntegerTypeCompatible(val: bigint, targetType: AST.TypeNode): boolean;
  getIntegerConstantValue(expr: AST.Expression): bigint | undefined;
  findOperatorOverload(
    targetType: AST.TypeNode,
    methodName: string,
    paramTypes: AST.TypeNode[],
  ): AST.FunctionDecl | undefined;
  resolveOverload(
    name: string,
    candidates: Symbol[],
    argTypes: (AST.TypeNode | undefined)[],
    genericArgs: AST.TypeNode[],
    location: SourceLocation,
  ): any;
  resolveMemberWithContext(
    baseType: AST.BasicTypeNode,
    memberName: string,
  ): any;
  resolveStructField(
    decl: AST.StructDecl,
    fieldName: string,
  ): AST.StructField | undefined;
  checkMatchExhaustiveness(expr: AST.MatchExpr, enumDecl: AST.EnumDecl): void;
  checkPattern(
    pattern: AST.Pattern,
    enumType: AST.TypeNode,
    enumDecl: AST.EnumDecl,
  ): void;
  checkMatchArmBody(
    body: AST.Expression | AST.BlockStmt,
  ): AST.TypeNode | undefined;
  checkBlock(stmt: AST.BlockStmt, newScope?: boolean): void;
  isCastAllowed(source: AST.TypeNode, target: AST.TypeNode): boolean;
}

/**
 * Check a literal expression and return its type
 */
export function checkLiteral(
  this: ExpressionCheckerContext,
  expr: AST.LiteralExpr,
): AST.TypeNode {
  let name = "void";
  if (expr.type === "number") {
    if (
      expr.raw.includes(".") ||
      expr.raw.includes("e") ||
      expr.raw.includes("E")
    ) {
      name = "float";
    } else {
      const val = BigInt(expr.raw);
      const INT32_MIN = -2147483648n;
      const INT32_MAX = 2147483647n;
      if (val >= INT32_MIN && val <= INT32_MAX) {
        name = "int";
      } else {
        name = "long";
      }
    }
  } else if (expr.type === "string") {
    name = "string";
  } else if (expr.type === "bool") {
    name = "bool";
  } else if (expr.type === "char") {
    name = "char";
  } else if (expr.type === "nullptr") {
    name = "nullptr";
  } else if (expr.type === "null") {
    name = "null";
  }

  return {
    kind: "BasicType",
    name,
    genericArgs: [],
    pointerDepth: 0,
    arrayDimensions: [],
    location: expr.location,
  };
}

/**
 * Check an identifier expression
 */
export function checkIdentifier(
  this: ExpressionCheckerContext,
  expr: AST.IdentifierExpr,
): AST.TypeNode | undefined {
  const symbol = this.currentScope.resolve(expr.name);
  if (!symbol) {
    const similar = this.currentScope.findSimilar(expr.name);
    const hint = similar
      ? `Did you mean '${similar}'?`
      : "Ensure the variable or function is declared before use.";
    throw new CompilerError(
      `Undefined symbol '${expr.name}'`,
      hint,
      expr.location,
    );
  }

  if (symbol.declaration) {
    expr.resolvedDeclaration = symbol.declaration as any;
  }

  if (symbol.kind === "Module") {
    return {
      kind: "ModuleType",
      name: expr.name,
      moduleScope: symbol.moduleScope,
      location: expr.location,
    } as any;
  }
  if (symbol.kind === "Struct") {
    return {
      kind: "MetaType",
      type: {
        kind: "BasicType",
        name: expr.name,
        genericArgs: [],
        pointerDepth: 0,
        arrayDimensions: [],
        location: expr.location,
      },
      location: expr.location,
    } as any;
  }
  if (symbol.kind === "Enum") {
    return {
      kind: "MetaType",
      type: {
        kind: "BasicType",
        name: expr.name,
        genericArgs: [],
        pointerDepth: 0,
        arrayDimensions: [],
        location: expr.location,
      },
      location: expr.location,
    } as any;
  }

  if (symbol.type) {
    return this.resolveType(symbol.type, false);
  }

  return symbol.type;
}

/**
 * Check a binary expression
 */
export function checkBinary(
  this: ExpressionCheckerContext,
  expr: AST.BinaryExpr,
): AST.TypeNode | undefined {
  const leftType = this.checkExpression(expr.left);
  const rightType = this.checkExpression(expr.right);

  if (!leftType || !rightType) return undefined;

  const op = expr.operator.type;

  // Try operator overload first (for user-defined types)
  const methodName = OPERATOR_METHOD_MAP[expr.operator.lexeme];
  if (methodName) {
    const method = this.findOperatorOverload(leftType, methodName, [rightType]);

    if (method) {
      // Build type substitution map for return type resolution (for generics)
      const typeSubstitutionMap = new Map<string, AST.TypeNode>();
      if (leftType.kind === "BasicType" && leftType.genericArgs.length > 0) {
        const decl = leftType.resolvedDeclaration;
        if (decl && decl.genericParams && decl.genericParams.length > 0) {
          for (let i = 0; i < decl.genericParams.length; i++) {
            typeSubstitutionMap.set(
              decl.genericParams[i]!.name,
              leftType.genericArgs[i]!,
            );
          }
        }
      }

      // Found operator overload! Annotate the node
      expr.operatorOverload = {
        methodName,
        targetType: leftType,
        methodDeclaration: method,
      };

      // Return the method's return type with generic substitution if needed
      return typeSubstitutionMap.size > 0
        ? this.substituteType(method.returnType, typeSubstitutionMap)
        : method.returnType;
    }
  }

  // Pointer arithmetic: pointer +/- integer
  if (
    leftType.kind === "BasicType" &&
    (leftType.pointerDepth > 0 || leftType.arrayDimensions.length > 0) &&
    (op === TokenType.Plus || op === TokenType.Minus)
  ) {
    if (rightType.kind === "BasicType" && TypeUtils.isIntegerType(rightType)) {
      // pointer + int = pointer
      return leftType;
    }
    // pointer - pointer = int (for same pointer type)
    if (
      op === TokenType.Minus &&
      rightType.kind === "BasicType" &&
      (rightType.pointerDepth > 0 || rightType.arrayDimensions.length > 0)
    ) {
      return {
        kind: "BasicType",
        name: "i64",
        genericArgs: [],
        pointerDepth: 0,
        arrayDimensions: [],
        location: expr.location,
      };
    }
  }

  // String concatenation
  if (
    leftType.kind === "BasicType" &&
    leftType.name === "string" &&
    rightType.kind === "BasicType" &&
    rightType.name === "string" &&
    op === TokenType.Plus
  ) {
    return leftType;
  }

  // Boolean operators
  if (op === TokenType.AndAnd || op === TokenType.OrOr) {
    const isBool = (t: AST.TypeNode) =>
      t.kind === "BasicType" && (t.name === "bool" || t.name === "i1");

    if (!isBool(leftType) || !isBool(rightType)) {
      throw new CompilerError(
        `Logical operators require boolean operands, got ${this.typeToString(
          leftType,
        )} and ${this.typeToString(rightType)}`,
        "Ensure both operands are boolean expressions.",
        expr.location,
      );
    }
    return leftType;
  }

  // Comparison operators
  if (TypeUtils.isComparisonOperator(op)) {
    // Allow comparison between compatible types
    if (!this.areTypesCompatible(leftType, rightType)) {
      throw new CompilerError(
        `Cannot compare ${this.typeToString(leftType)} and ${this.typeToString(rightType)}`,
        "Operands must be of compatible types.",
        expr.location,
      );
    }
    return {
      kind: "BasicType",
      name: "bool",
      genericArgs: [],
      pointerDepth: 0,
      arrayDimensions: [],
      location: expr.location,
    };
  }

  // Bitwise operators on integers
  if (
    [
      TokenType.Ampersand,
      TokenType.Pipe,
      TokenType.Caret,
      TokenType.LessLess,
      TokenType.GreaterGreater,
    ].includes(op)
  ) {
    if (
      !TypeUtils.isIntegerType(leftType) ||
      !TypeUtils.isIntegerType(rightType)
    ) {
      throw new CompilerError(
        `Bitwise operators require integer operands, got ${this.typeToString(
          leftType,
        )} and ${this.typeToString(rightType)}`,
        "Ensure both operands are integers.",
        expr.location,
      );
    }
    return leftType;
  }

  // Arithmetic operators
  if (!this.areTypesCompatible(leftType, rightType)) {
    throw new CompilerError(
      `Type mismatch: ${this.typeToString(leftType)} and ${this.typeToString(rightType)}`,
      "Ensure operands have compatible types.",
      expr.location,
    );
  }

  return leftType;
}

/**
 * Check a unary expression
 */
export function checkUnary(
  this: ExpressionCheckerContext,
  expr: AST.UnaryExpr,
): AST.TypeNode | undefined {
  const operandType = this.checkExpression(expr.operand);
  if (!operandType) return undefined;

  const op = expr.operator.type;

  // Try operator overload for user-defined types
  let lookupKey = expr.operator.lexeme;
  // Special handling for unary operators that share lexeme with binary operators or are defined with prefix in map
  if (["-", "+", "~"].includes(lookupKey)) {
    lookupKey = "unary" + lookupKey;
  }
  const methodName = OPERATOR_METHOD_MAP[lookupKey];
  if (methodName) {
    const method = this.findOperatorOverload(operandType, methodName, []);

    if (method) {
      // Build type substitution map for return type resolution (for generics)
      const typeSubstitutionMap = new Map<string, AST.TypeNode>();
      if (
        operandType.kind === "BasicType" &&
        operandType.genericArgs.length > 0
      ) {
        const decl = operandType.resolvedDeclaration;
        if (decl && decl.genericParams && decl.genericParams.length > 0) {
          for (let i = 0; i < decl.genericParams.length; i++) {
            typeSubstitutionMap.set(
              decl.genericParams[i]!.name,
              operandType.genericArgs[i]!,
            );
          }
        }
      }

      // Found operator overload! Annotate the node
      expr.operatorOverload = {
        methodName,
        targetType: operandType,
        methodDeclaration: method,
      };

      return typeSubstitutionMap.size > 0
        ? this.substituteType(method.returnType, typeSubstitutionMap)
        : method.returnType;
    }
  }

  // Address-of operator (&)
  if (op === TokenType.Ampersand) {
    if (operandType.kind === "BasicType") {
      return {
        ...operandType,
        pointerDepth: operandType.pointerDepth + 1,
      };
    }
    throw new CompilerError(
      `Cannot take address of ${this.typeToString(operandType)}`,
      "Address-of requires an lvalue.",
      expr.location,
    );
  }

  // Dereference operator (*)
  if (op === TokenType.Star) {
    if (operandType.kind === "BasicType") {
      if (operandType.pointerDepth > 0) {
        return {
          ...operandType,
          pointerDepth: operandType.pointerDepth - 1,
        };
      }
      if (operandType.arrayDimensions.length > 0) {
        // Dereferencing array gives element type
        return {
          ...operandType,
          arrayDimensions: operandType.arrayDimensions.slice(1),
        };
      }
    }
    throw new CompilerError(
      `Cannot dereference non-pointer type ${this.typeToString(operandType)}`,
      "Dereference requires a pointer type.",
      expr.location,
    );
  }

  // Logical not (!)
  if (op === TokenType.Bang) {
    if (!this.isBoolType(operandType)) {
      throw new CompilerError(
        `Logical not requires boolean operand, got ${this.typeToString(operandType)}`,
        "Ensure the operand is a boolean expression.",
        expr.location,
      );
    }
    return operandType;
  }

  // Bitwise not (~)
  if (op === TokenType.Tilde) {
    if (!TypeUtils.isIntegerType(operandType)) {
      throw new CompilerError(
        `Bitwise not requires integer operand, got ${this.typeToString(operandType)}`,
        "Ensure the operand is an integer.",
        expr.location,
      );
    }
    return operandType;
  }

  // Numeric negation (-)
  if (op === TokenType.Minus) {
    if (operandType.kind !== "BasicType") {
      throw new CompilerError(
        `Cannot negate ${this.typeToString(operandType)}`,
        "Negation requires a numeric type.",
        expr.location,
      );
    }
    return operandType;
  }

  return operandType;
}

/**
 * Check an array literal expression
 */
export function checkArrayLiteral(
  this: ExpressionCheckerContext,
  expr: AST.ArrayLiteralExpr,
): AST.TypeNode | undefined {
  if (expr.elements.length === 0) return undefined;

  const firstType = this.checkExpression(expr.elements[0]!);
  for (let i = 1; i < expr.elements.length; i++) {
    const elemType = this.checkExpression(expr.elements[i]!);
    if (
      firstType &&
      elemType &&
      !this.areTypesCompatible(firstType, elemType)
    ) {
      throw new CompilerError(
        `Array literal has inconsistent element types: ${this.typeToString(
          firstType,
        )} vs ${this.typeToString(elemType)}`,
        "All elements in an array literal must have the same type.",
        expr.elements[i]!.location,
      );
    }
  }

  if (firstType && firstType.kind === "BasicType") {
    return {
      ...firstType,
      arrayDimensions: [...firstType.arrayDimensions, expr.elements.length],
    };
  }
  return undefined;
}

/**
 * Check a struct literal expression
 */
export function checkStructLiteral(
  this: ExpressionCheckerContext,
  expr: AST.StructLiteralExpr,
): AST.TypeNode | undefined {
  const symbol = this.currentScope.resolve(expr.structName);
  if (!symbol || symbol.kind !== "Struct") {
    throw new CompilerError(
      `Unknown struct '${expr.structName}'`,
      "Ensure the struct is defined.",
      expr.location,
    );
  }

  const decl = symbol.declaration as AST.StructDecl;

  for (const field of expr.fields) {
    const memberResult = this.resolveStructField(decl, field.name);
    if (!memberResult) {
      throw new CompilerError(
        `Unknown field '${field.name}' in struct '${expr.structName}'`,
        "Check the struct definition for valid fields.",
        field.value.location,
      );
    }

    const { field: member, type: memberType } = memberResult;

    const valueType = this.checkExpression(field.value);
    if (valueType) {
      const resolvedMemberType = this.resolveType(memberType);
      const resolvedValueType = this.resolveType(valueType);

      if (!this.areTypesCompatible(resolvedMemberType, resolvedValueType)) {
        throw new CompilerError(
          `Type mismatch for field '${field.name}': expected ${this.typeToString(
            memberType,
          )}, got ${this.typeToString(valueType)}`,
          "Field value must match the declared type.",
          field.value.location,
        );
      }
    }
  }

  return {
    kind: "BasicType",
    name: expr.structName,
    genericArgs: [],
    pointerDepth: 0,
    arrayDimensions: [],
    location: expr.location,
  };
}

/**
 * Check a tuple literal expression
 */
export function checkTupleLiteral(
  this: ExpressionCheckerContext,
  expr: AST.TupleLiteralExpr,
): AST.TypeNode {
  const types: AST.TypeNode[] = [];

  for (const elem of expr.elements) {
    const elemType = this.checkExpression(elem);
    if (elemType) {
      types.push(elemType);
    } else {
      types.push(this.makeVoidType());
    }
  }

  return {
    kind: "TupleType",
    types,
    location: expr.location,
  };
}

/**
 * Check a ternary expression
 */
export function checkTernary(
  this: ExpressionCheckerContext,
  expr: AST.TernaryExpr,
): AST.TypeNode | undefined {
  const condType = this.checkExpression(expr.condition);
  if (condType && !this.isBoolType(condType)) {
    throw new CompilerError(
      `Ternary condition must be boolean, got ${this.typeToString(condType)}`,
      "Ensure the condition evaluates to a boolean.",
      expr.condition.location,
    );
  }

  const thenType = this.checkExpression(expr.trueExpr);
  const elseType = this.checkExpression(expr.falseExpr);

  if (thenType && elseType && !this.areTypesCompatible(thenType, elseType)) {
    throw new CompilerError(
      `Ternary branches must have compatible types: ${this.typeToString(
        thenType,
      )} vs ${this.typeToString(elseType)}`,
      "Both branches must return the same type.",
      expr.location,
    );
  }

  return thenType;
}

/**
 * Check a cast expression
 */
export function checkCast(
  this: ExpressionCheckerContext,
  expr: AST.CastExpr,
): AST.TypeNode {
  const exprType = this.checkExpression(expr.expression);

  if (exprType) {
    const resolved = this.resolveType(exprType);
    const target = this.resolveType(expr.targetType);

    // Check if cast is allowed using isCastAllowed from base
    if (!(this as any).isCastAllowed(resolved, target)) {
      throw new CompilerError(
        `Cannot cast ${this.typeToString(resolved)} to ${this.typeToString(target)}`,
        "This cast is not allowed.",
        expr.location,
      );
    }
  }

  return expr.targetType;
}

/**
 * Check a sizeof expression
 */
export function checkSizeof(
  this: ExpressionCheckerContext,
  expr: AST.SizeofExpr,
): AST.TypeNode {
  if ("kind" in expr.target && (expr.target.kind as string) !== "BasicType") {
    this.checkExpression(expr.target as AST.Expression);
  }
  return {
    kind: "BasicType",
    name: "i64",
    genericArgs: [],
    pointerDepth: 0,
    arrayDimensions: [],
    location: expr.location,
  };
}

/**
 * Check a type match expression (match<T>(value))
 */
export function checkTypeMatch(
  this: ExpressionCheckerContext,
  expr: AST.TypeMatchExpr,
): AST.TypeNode {
  if ("kind" in expr.value && (expr.value.kind as string) !== "BasicType") {
    this.checkExpression(expr.value as AST.Expression);
  }

  const targetType = expr.targetType as AST.BasicTypeNode;
  const targetTypeName = targetType.name;

  // Check if this is an enum variant pattern
  if (targetTypeName.includes(".")) {
    const parts = targetTypeName.split(".");
    let enumName = parts[0]!;

    const genericMatch = enumName.match(/^([^<]+)/);
    if (genericMatch) {
      enumName = genericMatch[1]!;
    }

    const enumDecl = this.currentScope.resolve(enumName);
    if (!enumDecl || enumDecl.kind !== "Enum") {
      throw new CompilerError(
        `Cannot find enum '${enumName}'`,
        `The type '${enumName}' in match<${targetTypeName}> is not a defined enum.`,
        expr.location,
      );
    }
  } else {
    const isDefined =
      KNOWN_TYPES.includes(targetTypeName) ||
      this.currentScope.resolve(targetTypeName);

    if (!isDefined) {
      throw new CompilerError(
        `Unknown type '${targetTypeName}'`,
        `The type '${targetTypeName}' in match<${targetTypeName}> is not defined.`,
        expr.location,
      );
    }
  }

  return {
    kind: "BasicType",
    name: "bool",
    genericArgs: [],
    pointerDepth: 0,
    arrayDimensions: [],
    location: expr.location,
  };
}

/**
 * Check a match expression
 */
export function checkMatchExpr(
  this: ExpressionCheckerContext,
  expr: AST.MatchExpr,
): AST.TypeNode {
  const valueType = this.checkExpression(expr.value);
  if (!valueType) {
    throw new CompilerError(
      "Match value has no type",
      "Cannot match on values without a type.",
      expr.value.location,
    );
  }

  if (valueType.kind !== "BasicType") {
    throw new CompilerError(
      `Match value must be an enum type, got ${this.typeToString(valueType)}`,
      "Match expressions are currently only supported on enum types.",
      expr.value.location,
    );
  }

  const symbol = this.currentScope.resolve(valueType.name);
  if (!symbol) {
    throw new CompilerError(
      `Cannot find type '${valueType.name}'`,
      "Ensure the enum is declared before use.",
      expr.value.location,
    );
  }
  if (symbol.kind !== "Enum") {
    throw new CompilerError(
      `Cannot match on non-enum type '${valueType.name}' (found ${symbol.kind})`,
      "Match expressions are currently only supported on enum types.",
      expr.value.location,
    );
  }

  const enumDecl = symbol.declaration as AST.EnumDecl;

  this.checkMatchExhaustiveness(expr, enumDecl);

  let resultType: AST.TypeNode | undefined;
  for (const arm of expr.arms) {
    this.currentScope = this.currentScope.enterScope();

    this.checkPattern(arm.pattern, valueType, enumDecl);

    if (arm.guard) {
      const guardType = this.checkExpression(arm.guard);
      if (guardType && !this.isBoolType(guardType)) {
        throw new CompilerError(
          `Match guard must be a boolean expression, got ${this.typeToString(guardType)}`,
          "Guards must evaluate to bool.",
          arm.guard.location,
        );
      }
    }

    const armType = this.checkMatchArmBody(arm.body);

    this.currentScope = this.currentScope.exitScope();

    if (!resultType) {
      resultType = armType;
    } else if (armType && !this.areTypesCompatible(resultType, armType)) {
      throw new CompilerError(
        `Match arms must have compatible types: ${this.typeToString(
          resultType,
        )} vs ${this.typeToString(armType)}`,
        "All match arms must return the same type.",
        arm.location,
      );
    }
  }

  return resultType || this.makeVoidType();
}
