/**
 * Call, Member, and Index expression checkers - extracted from TypeChecker
 */
import * as AST from "../common/AST";
import { CompilerError, type SourceLocation } from "../common/CompilerError";
import type { Symbol } from "./SymbolTable";

/**
 * Context interface that call checker functions expect
 */
export interface CallCheckerContext {
  currentScope: {
    resolve(name: string): Symbol | undefined;
    enterScope(): any;
    exitScope(): any;
  };
  checkExpression(expr: AST.Expression): AST.TypeNode | undefined;
  resolveType(type: AST.TypeNode): AST.TypeNode;
  areTypesCompatible(a: AST.TypeNode, b: AST.TypeNode): boolean;
  typeToString(type: AST.TypeNode): string;
  resolveOverload(
    name: string,
    candidates: Symbol[],
    argTypes: (AST.TypeNode | undefined)[],
    genericArgs: AST.TypeNode[],
    location: SourceLocation,
  ): {
    symbol: Symbol;
    type: AST.FunctionTypeNode;
    declaration: AST.ASTNode;
    genericArgs?: AST.TypeNode[];
  };
  substituteType(
    type: AST.TypeNode,
    typeMap: Map<string, AST.TypeNode>,
  ): AST.TypeNode;
  findOperatorOverload(
    targetType: AST.TypeNode,
    methodName: string,
    argTypes: AST.TypeNode[],
  ): AST.FunctionDecl | undefined;
  resolveMemberWithContext(
    type: AST.BasicTypeNode,
    memberName: string,
  ):
    | {
        members: (AST.FunctionDecl | AST.StructField)[];
        genericMap: Map<string, AST.TypeNode>;
      }
    | undefined;
}

/**
 * Check a call expression
 */
export function checkCall(
  this: CallCheckerContext,
  expr: AST.CallExpr,
): AST.TypeNode | undefined {
  let name: string | undefined;
  let genericArgs: AST.TypeNode[] = expr.genericArgs || [];

  // Handle direct function calls or generic instantiation calls
  if (expr.callee.kind === "Identifier") {
    name = (expr.callee as AST.IdentifierExpr).name;
  } else if (expr.callee.kind === "GenericInstantiation") {
    const genExpr = expr.callee as AST.GenericInstantiationExpr;
    if (genExpr.base.kind === "Identifier") {
      name = (genExpr.base as AST.IdentifierExpr).name;
      if (genericArgs.length === 0) {
        genericArgs = genExpr.genericArgs;
      }
    }
  }

  if (name) {
    const symbol = this.currentScope.resolve(name);

    if (symbol && symbol.kind === "Function") {
      const candidates = [symbol, ...(symbol.overloads || [])];
      const argTypes = expr.args.map((arg) => this.checkExpression(arg));

      const match = this.resolveOverload(
        name,
        candidates,
        argTypes,
        genericArgs,
        expr.location,
      );

      expr.resolvedDeclaration = match.declaration as
        | AST.FunctionDecl
        | AST.ExternDecl;
      expr.callee.resolvedType = match.type;

      // Ensure base identifier in GenericInstantiation has resolvedType for CodeGenerator
      if (expr.callee.kind === "GenericInstantiation") {
        const genExpr = expr.callee as AST.GenericInstantiationExpr;
        if (genExpr.base.kind === "Identifier") {
          genExpr.base.resolvedType = match.type;
        }
      }

      if (match.genericArgs) {
        expr.genericArgs = match.genericArgs;
      }

      return (match.type as AST.FunctionTypeNode).returnType;
    }
  }

  const calleeType = this.checkExpression(expr.callee);
  const argTypes = expr.args.map((arg) => this.checkExpression(arg));

  // Handle enum variant constructor
  if (expr.callee.kind === "Member") {
    const memberExpr = expr.callee as AST.MemberExpr;
    const enumVariantInfo = (memberExpr as any).enumVariantInfo;

    if (enumVariantInfo) {
      return handleEnumVariantCall.call(
        this,
        expr,
        enumVariantInfo,
        argTypes,
        calleeType,
      );
    }
  }

  // Try __call__ operator overload
  if (calleeType && calleeType.kind !== "FunctionType") {
    const method = this.findOperatorOverload(
      calleeType,
      "__call__",
      argTypes.filter((t): t is AST.TypeNode => t !== undefined),
    );

    if (method) {
      expr.operatorOverload = {
        methodName: "__call__",
        targetType: calleeType,
        methodDeclaration: method,
      };
      return this.resolveType(method.returnType);
    }

    throw new CompilerError(
      `Type '${this.typeToString(calleeType)}' is not callable`,
      "Only functions or types with __call__ operator can be called.",
      expr.location,
    );
  }

  if (calleeType && calleeType.kind === "FunctionType") {
    const funcType = calleeType as AST.FunctionTypeNode;
    const overloads = (funcType as any).overloads as AST.FunctionTypeNode[];

    if (overloads && overloads.length > 0) {
      let bestMatch: AST.FunctionTypeNode | undefined;

      for (const candidate of overloads) {
        if (
          !candidate.isVariadic &&
          candidate.paramTypes.length !== argTypes.length
        )
          continue;

        let match = true;
        for (let i = 0; i < candidate.paramTypes.length; i++) {
          const paramType = candidate.paramTypes[i]!;
          const argType = argTypes[i];
          if (argType && !this.areTypesCompatible(paramType, argType)) {
            match = false;
            break;
          }
        }

        if (match) {
          bestMatch = candidate;
          break;
        }
      }

      if (bestMatch) {
        expr.callee.resolvedType = bestMatch;
        if (bestMatch.declaration) {
          expr.resolvedDeclaration = bestMatch.declaration as AST.FunctionDecl;
        }
        return validateFunctionCall.call(this, expr, bestMatch, argTypes);
      }
    }

    if (calleeType.declaration) {
      expr.resolvedDeclaration = calleeType.declaration as AST.FunctionDecl;
    }
    return validateFunctionCall.call(
      this,
      expr,
      calleeType as AST.FunctionTypeNode,
      argTypes,
    );
  }

  return undefined;
}

function handleEnumVariantCall(
  this: CallCheckerContext,
  expr: AST.CallExpr,
  enumVariantInfo: any,
  argTypes: (AST.TypeNode | undefined)[],
  calleeType: AST.TypeNode | undefined,
): AST.TypeNode | undefined {
  const variant = enumVariantInfo.variant as AST.EnumVariant;
  const typeMap = new Map<string, AST.TypeNode>();
  const enumDecl = enumVariantInfo.enumDecl as AST.EnumDecl;
  const genericArgs = enumVariantInfo.genericArgs || [];

  if (enumDecl.genericParams && genericArgs.length > 0) {
    for (
      let i = 0;
      i < enumDecl.genericParams.length && i < genericArgs.length;
      i++
    ) {
      typeMap.set(enumDecl.genericParams[i]!.name, genericArgs[i]!);
    }
  }

  if (variant.dataType) {
    if (variant.dataType.kind === "EnumVariantTuple") {
      const expectedTypes = variant.dataType.types;

      if (argTypes.length !== expectedTypes.length) {
        throw new CompilerError(
          `Enum variant '${variant.name}' expects ${expectedTypes.length} arguments, but got ${argTypes.length}`,
          `Usage: ${enumDecl.name}.${variant.name}(${expectedTypes
            .map((t: AST.TypeNode) => this.typeToString(t))
            .join(", ")})`,
          expr.location,
        );
      }

      for (let i = 0; i < expectedTypes.length; i++) {
        let expectedType = expectedTypes[i]!;
        if (typeMap.size > 0) {
          expectedType = this.substituteType(expectedType, typeMap);
        }
        expectedType = this.resolveType(expectedType);
        const actualType = argTypes[i];
        if (actualType && !this.areTypesCompatible(expectedType, actualType)) {
          throw new CompilerError(
            `Type mismatch for argument ${i + 1} of '${variant.name}': expected ${this.typeToString(
              expectedType,
            )}, got ${this.typeToString(actualType)}`,
            "Check the variant definition and argument types.",
            expr.location,
          );
        }
      }
    }
  } else if (argTypes.length > 0) {
    throw new CompilerError(
      `Unit variant '${variant.name}' does not take any arguments`,
      `Use: ${enumDecl.name}.${variant.name}`,
      expr.location,
    );
  }

  (expr as any).enumVariantInfo = enumVariantInfo;
  return calleeType;
}

function validateFunctionCall(
  this: CallCheckerContext,
  expr: AST.CallExpr,
  funcType: AST.FunctionTypeNode,
  argTypes: (AST.TypeNode | undefined)[],
): AST.TypeNode {
  if (!funcType.isVariadic && funcType.paramTypes.length !== expr.args.length) {
    throw new CompilerError(
      `Expected ${funcType.paramTypes.length} arguments, got ${expr.args.length}`,
      "Argument count mismatch.",
      expr.location,
    );
  }

  for (let i = 0; i < funcType.paramTypes.length; i++) {
    const paramType = funcType.paramTypes[i]!;
    const argType = argTypes[i];
    if (argType && !this.areTypesCompatible(paramType, argType)) {
      throw new CompilerError(
        `Argument ${i + 1} type mismatch: expected ${this.typeToString(
          paramType,
        )}, got ${this.typeToString(argType)}`,
        "Ensure argument types match.",
        expr.args[i]!.location,
      );
    }
  }

  return funcType.returnType;
}

/**
 * Check a member access expression
 */
export function checkMember(
  this: CallCheckerContext,
  expr: AST.MemberExpr,
): AST.TypeNode | undefined {
  const objectType = this.checkExpression(expr.object);
  if (!objectType) return undefined;

  // Handle module member access
  if ((objectType as any).kind === "ModuleType") {
    const moduleScope = (objectType as any).moduleScope;
    const symbol = moduleScope?.resolve(expr.property);
    if (!symbol) {
      throw new CompilerError(
        `Module has no exported member '${expr.property}'`,
        "Check the module's exports.",
        expr.location,
      );
    }

    if (symbol.kind === "Enum") {
      const enumDecl = symbol.declaration as AST.EnumDecl;
      return {
        kind: "MetaType",
        type: {
          kind: "BasicType",
          name: enumDecl.name,
          genericArgs: [],
          pointerDepth: 0,
          arrayDimensions: [],
          location: expr.location,
        },
        location: expr.location,
      } as any;
    }

    return symbol.type;
  }

  // Handle enum variant access
  if ((objectType as any).kind === "MetaType") {
    const innerType = (objectType as any).type as AST.BasicTypeNode;
    const symbol = this.currentScope.resolve(innerType.name);

    if (symbol && symbol.kind === "Enum") {
      const enumDecl = symbol.declaration as AST.EnumDecl;
      const variant = enumDecl.variants.find((v) => v.name === expr.property);

      if (!variant) {
        throw new CompilerError(
          `Enum '${innerType.name}' has no variant '${expr.property}'`,
          `Available variants: ${enumDecl.variants.map((v) => v.name).join(", ")}`,
          expr.location,
        );
      }

      // Store variant info for code generation
      (expr as any).enumVariantInfo = {
        enumDecl,
        variant,
        variantIndex: enumDecl.variants.indexOf(variant),
        genericArgs: innerType.genericArgs,
      };

      // Return the enum type - variant construction returns enum type
      return {
        kind: "BasicType",
        name: innerType.name,
        genericArgs: innerType.genericArgs || [],
        pointerDepth: 0,
        arrayDimensions: [],
        location: expr.location,
      };
    }

    if (symbol && symbol.kind === "Struct") {
      const memberContext = this.resolveMemberWithContext(
        innerType,
        expr.property,
      );
      if (memberContext) {
        const { members, genericMap } = memberContext;
        const methods = members.filter(
          (m) => m.kind === "FunctionDecl",
        ) as AST.FunctionDecl[];

        if (methods.length > 0) {
          const candidates = methods.map((method) => {
            // Substitute generics if we have a map
            let returnType = method.returnType;
            let paramTypes = method.params.map((p) => p.type);

            if (genericMap && genericMap.size > 0) {
              returnType = this.substituteType(returnType, genericMap);
              paramTypes = paramTypes.map((t) =>
                this.substituteType(t, genericMap),
              );
            }

            return {
              kind: "FunctionType",
              returnType: returnType,
              paramTypes: paramTypes,
              location: expr.location,
              declaration: method,
            } as AST.FunctionTypeNode;
          });

          if (candidates.length === 1) {
            return candidates[0];
          }

          const result = candidates[0]!;
          (result as any).overloads = candidates;
          return result;
        }

        throw new CompilerError(
          `No static member '${expr.property}' found on type '${innerType.name}'`,
          "Ensure the member is static (does not take 'this').",
          expr.location,
        );
      }
    }
  }

  // Handle struct/enum member access
  if (objectType.kind === "BasicType") {
    const baseType =
      objectType.pointerDepth > 0
        ? { ...objectType, pointerDepth: objectType.pointerDepth - 1 }
        : objectType;

    // Check if it's an enum and look for methods
    const symbol = this.currentScope.resolve(baseType.name);
    if (symbol && symbol.kind === "Enum") {
      const enumDecl = symbol.declaration as AST.EnumDecl;
      const methods = (enumDecl.methods || []).filter(
        (m: AST.FunctionDecl) => m.name === expr.property,
      );

      if (methods.length > 0) {
        // Build method function types, stripping 'this' parameter
        const candidates: AST.FunctionTypeNode[] = [];

        for (const method of methods) {
          // Check if first param is 'this' and strip it
          let paramTypes = method.params.map((p) => p.type);
          if (method.params.length > 0 && method.params[0]!.name === "this") {
            paramTypes = method.params.slice(1).map((p) => p.type);
          }

          const funcType: AST.FunctionTypeNode = {
            kind: "FunctionType",
            returnType: method.returnType,
            paramTypes,
            location: method.location,
            declaration: method,
          } as any;

          candidates.push(funcType);
        }

        if (candidates.length === 1 && candidates[0]) {
          return candidates[0];
        }

        // Multiple overloads
        if (candidates.length > 0 && candidates[0]) {
          (candidates[0] as any).overloads = candidates;
          return candidates[0];
        }
      }

      // If no method found, it's an error (enum doesn't have fields)
      throw new CompilerError(
        `Enum '${enumDecl.name}' has no method '${expr.property}'`,
        `To access enum variants, use the enum type directly (e.g., ${enumDecl.name}.${expr.property}).`,
        expr.location,
      );
    }
    const memberContext = this.resolveMemberWithContext(
      baseType as AST.BasicTypeNode,
      expr.property,
    );
    if (memberContext) {
      const { members, genericMap } = memberContext;
      const member = members[0];

      if (member && member.kind === "StructField") {
        const fieldType = this.resolveType((member as AST.StructField).type);
        if (genericMap && genericMap.size > 0) {
          return this.substituteType(fieldType, genericMap);
        }
        return fieldType;
      }

      if (
        member &&
        (member.kind === "FunctionDecl" || member.kind === "SpecMethod")
      ) {
        const allMethods = members.filter(
          (m) => m.kind === "FunctionDecl" || m.kind === "SpecMethod",
        ) as (AST.FunctionDecl | AST.SpecMethod)[];

        // Filter out static methods and check 'this' compatibility
        const compatibleMethods: (AST.FunctionDecl | AST.SpecMethod)[] = [];
        for (const method of allMethods) {
          // Skip static methods (no 'this' parameter)
          if (method.kind === "FunctionDecl" && method.isStatic) continue;

          // Check if method has a 'this' parameter
          if (method.params.length > 0 && method.params[0]!.name === "this") {
            let thisParamType = method.params[0]!.type;

            // Substitute generics if needed
            if (genericMap && genericMap.size > 0) {
              thisParamType = this.substituteType(thisParamType, genericMap);
            }

            // Check compatibility of 'this' parameter type with object type
            const isThisCompatible = this.areTypesCompatible(
              thisParamType,
              objectType,
            );

            // Also handle pointer compatibility (this: T* vs object: T)
            const pointerCompatible =
              thisParamType.kind === "BasicType" &&
              objectType.kind === "BasicType" &&
              thisParamType.name === objectType.name &&
              thisParamType.pointerDepth === objectType.pointerDepth + 1;

            // Also handle dereference compatibility (this: T vs object: T*)
            const dereferenceCompatible =
              thisParamType.kind === "BasicType" &&
              objectType.kind === "BasicType" &&
              thisParamType.name === objectType.name &&
              thisParamType.pointerDepth === objectType.pointerDepth - 1;

            if (
              !isThisCompatible &&
              !pointerCompatible &&
              !dereferenceCompatible
            ) {
              continue; // Skip incompatible methods
            }
          } else {
            // Method has no 'this' parameter - this is a static method called on instance
            continue;
          }

          compatibleMethods.push(method);
        }

        if (compatibleMethods.length === 0) {
          throw new CompilerError(
            `No compatible instance method '${expr.property}' found on type '${this.typeToString(
              objectType,
            )}'`,
            "Static methods must be called on the type, not an instance.",
            expr.location,
          );
        }

        if (compatibleMethods.length === 1 && compatibleMethods[0]) {
          const method = compatibleMethods[0];
          // Strip 'this' parameter
          let paramTypes = method.params.slice(1).map((p) => p.type);
          let returnType =
            method.returnType ||
            ({
              kind: "BasicType",
              name: "void",
              genericArgs: [],
              pointerDepth: 0,
              arrayDimensions: [],
              location: method.location,
            } as AST.TypeNode);

          if (genericMap && genericMap.size > 0) {
            returnType = this.substituteType(returnType, genericMap);
            paramTypes = paramTypes.map((t) =>
              this.substituteType(t, genericMap),
            );
          }

          return {
            kind: "FunctionType",
            returnType: returnType,
            paramTypes,
            location: expr.location,
            declaration: method,
          } as AST.FunctionTypeNode;
        }

        // Multiple overloads
        if (compatibleMethods.length > 0 && compatibleMethods[0]) {
          const first = compatibleMethods[0];
          let firstParamTypes = first.params.slice(1).map((p) => p.type);
          let firstReturnType = first.returnType || {
            kind: "BasicType",
            name: "void",
            genericArgs: [],
            pointerDepth: 0,
            arrayDimensions: [],
            location: first.location,
          };

          if (genericMap && genericMap.size > 0) {
            firstReturnType = this.substituteType(firstReturnType, genericMap);
            firstParamTypes = firstParamTypes.map((t) =>
              this.substituteType(t, genericMap),
            );
          }

          return {
            kind: "FunctionType",
            returnType: firstReturnType,
            paramTypes: firstParamTypes,
            location: expr.location,
            overloads: compatibleMethods.map((m) => {
              let params = m.params.slice(1).map((p) => p.type);
              let ret = m.returnType || {
                kind: "BasicType",
                name: "void",
                genericArgs: [],
                pointerDepth: 0,
                arrayDimensions: [],
                location: m.location,
              };
              if (genericMap && genericMap.size > 0) {
                ret = this.substituteType(ret, genericMap);
                params = params.map((t) => this.substituteType(t, genericMap));
              }
              return {
                kind: "FunctionType" as const,
                returnType: ret,
                paramTypes: params,
                location: m.location,
                declaration: m,
              };
            }),
          } as any;
        }
      }
    }
  }

  // Handle tuple indexing
  if (objectType.kind === "TupleType") {
    const index = parseInt(expr.property, 10);
    if (!isNaN(index) && index >= 0 && index < objectType.types.length) {
      return objectType.types[index];
    }
    throw new CompilerError(
      `Invalid tuple index '${expr.property}'`,
      `Valid indices are 0-${objectType.types.length - 1}`,
      expr.location,
    );
  }

  throw new CompilerError(
    `Cannot access member '${expr.property}' on type '${this.typeToString(objectType)}'`,
    "Check the type definition for available members.",
    expr.location,
  );
}

/**
 * Check an index expression
 */
export function checkIndex(
  this: CallCheckerContext,
  expr: AST.IndexExpr,
): AST.TypeNode | undefined {
  const objectType = this.checkExpression(expr.object);
  const indexType = this.checkExpression(expr.index);

  if (!objectType) return undefined;

  // Handle array indexing
  if (
    objectType.kind === "BasicType" &&
    objectType.arrayDimensions &&
    objectType.arrayDimensions.length > 0
  ) {
    const innerType = { ...objectType };
    innerType.arrayDimensions = innerType.arrayDimensions.slice(1);
    return innerType;
  }

  // Handle pointer indexing
  if (objectType.kind === "BasicType" && objectType.pointerDepth > 0) {
    return {
      ...objectType,
      pointerDepth: objectType.pointerDepth - 1,
    };
  }

  // Try __get__ operator overload
  if (indexType) {
    const method = this.findOperatorOverload(objectType, "__get__", [
      indexType,
    ]);
    if (method) {
      expr.operatorOverload = {
        methodName: "__get__",
        targetType: objectType,
        methodDeclaration: method,
      };
      return this.resolveType(method.returnType);
    }
  }

  throw new CompilerError(
    `Type '${this.typeToString(objectType)}' is not indexable`,
    "Only arrays, pointers, or types with __get__ operator can be indexed.",
    expr.location,
  );
}
