/**
 * Operator overload resolution for the BPL type checker
 * Handles operator method lookup and overload resolution
 */

import * as AST from "../common/AST";
import { CompilerError, type SourceLocation } from "../common/CompilerError";
import type { Symbol, SymbolTable } from "./SymbolTable";

/**
 * Operator to method name mapping for operator overloading
 */
export const OPERATOR_METHOD_MAP: Record<string, string> = {
  // Binary Arithmetic
  "+": "__add__",
  "-": "__sub__",
  "*": "__mul__",
  "/": "__div__",
  "%": "__mod__",

  // Binary Bitwise
  "&": "__and__",
  "|": "__or__",
  "^": "__xor__",
  "<<": "__lshift__",
  ">>": "__rshift__",

  // Comparison
  "==": "__eq__",
  "!=": "__ne__",
  "<": "__lt__",
  ">": "__gt__",
  "<=": "__le__",
  ">=": "__ge__",

  // Unary (prefixed with "unary" to distinguish from binary)
  "unary-": "__neg__",
  "unary~": "__not__",
  "unary+": "__pos__",
};

/**
 * Overload resolution context
 */
export interface OverloadResolutionContext {
  resolveType: (type: AST.TypeNode, checkConstraints?: boolean) => AST.TypeNode;
  areTypesCompatible: (t1: AST.TypeNode, t2: AST.TypeNode, checkConstraints?: boolean) => boolean;
  areTypesExactMatch: (t1: AST.TypeNode, t2: AST.TypeNode) => boolean;
  isImplicitWideningAllowed: (source: AST.TypeNode, target: AST.TypeNode) => boolean;
  substituteType: (type: AST.TypeNode, map: Map<string, AST.TypeNode>) => AST.TypeNode;
  typeToString: (type: AST.TypeNode | undefined) => string;
  scope: SymbolTable;
}

/**
 * Overload resolver for function and operator overloads
 */
export class OverloadResolver {
  private ctx: OverloadResolutionContext;

  constructor(context: OverloadResolutionContext) {
    this.ctx = context;
  }

  /**
   * Check if two function signatures are equal (same parameter types)
   */
  areSignaturesEqual(a: AST.FunctionTypeNode, b: AST.FunctionTypeNode): boolean {
    if (a.paramTypes.length !== b.paramTypes.length) return false;
    for (let i = 0; i < a.paramTypes.length; i++) {
      if (this.ctx.typeToString(a.paramTypes[i]!) !== this.ctx.typeToString(b.paramTypes[i]!))
        return false;
    }
    return true;
  }

  /**
   * Resolve the best matching overload for a function call
   */
  resolveOverload(
    name: string,
    candidates: Symbol[],
    argTypes: (AST.TypeNode | undefined)[],
    genericArgs: AST.TypeNode[],
    location: SourceLocation
  ): {
    symbol: Symbol;
    type: AST.FunctionTypeNode;
    declaration: AST.ASTNode;
    genericArgs?: AST.TypeNode[];
  } {
    const viableCandidates: {
      symbol: Symbol;
      inferredArgs?: AST.TypeNode[];
    }[] = [];

    for (const c of candidates) {
      const ft = c.type as AST.FunctionTypeNode;
      const decl = c.declaration as AST.FunctionDecl | AST.ExternDecl;

      // Check param count
      if (ft.isVariadic) {
        if (ft.paramTypes.length > argTypes.length) continue;
      } else {
        if (ft.paramTypes.length !== argTypes.length) continue;
      }

      if (genericArgs.length > 0) {
        // Explicit generics
        if (decl.kind !== "FunctionDecl") continue;
        if (decl.genericParams.length !== genericArgs.length) continue;
        viableCandidates.push({ symbol: c });
      } else {
        // No explicit generics
        if (decl.kind === "FunctionDecl" && decl.genericParams.length > 0) {
          // Generic inference is disabled by user request.
          // Only explicit generic arguments are allowed.
          continue;
        } else {
          // Non-generic
          viableCandidates.push({ symbol: c });
        }
      }
    }

    if (viableCandidates.length === 0) {
      throw new CompilerError(
        `No matching function for call to '${name}' with ${argTypes.length} arguments${
          genericArgs.length > 0 ? ` and ${genericArgs.length} generic arguments` : ""
        }.`,
        `Available overloads:\n${candidates.map((c) => this.ctx.typeToString(c.type!)).join("\n")}`,
        location
      );
    }

    // Create a list of candidates with substituted types if generic
    const substitutedCandidates = viableCandidates.map((vc) => {
      const c = vc.symbol;
      const decl = c.declaration as AST.FunctionDecl | AST.ExternDecl;
      const args = genericArgs.length > 0 ? genericArgs : vc.inferredArgs;

      if (args && decl.kind === "FunctionDecl") {
        const map = new Map<string, AST.TypeNode>();
        for (let i = 0; i < decl.genericParams.length; i++) {
          map.set(decl.genericParams[i]!.name, args[i]!);
        }
        const sub = this.ctx.substituteType(c.type!, map) as AST.FunctionTypeNode;
        return {
          symbol: c,
          type: sub,
          declaration: decl,
          genericArgs: args,
        };
      }
      return {
        symbol: c,
        type: c.type as AST.FunctionTypeNode,
        declaration: decl,
        genericArgs: undefined,
      };
    });

    // Categorize matches by specificity for better overload resolution
    const exactMatches: typeof substitutedCandidates = [];
    const wideningMatches: typeof substitutedCandidates = [];
    const compatibleMatches: typeof substitutedCandidates = [];

    for (const c of substitutedCandidates) {
      const ft = c.type;
      let isExact = true;
      let needsWidening = false;
      let allCompatible = true;

      for (let i = 0; i < ft.paramTypes.length; i++) {
        if (!argTypes[i]) {
          allCompatible = false;
          break;
        }

        const exactMatch = this.ctx.areTypesExactMatch(ft.paramTypes[i]!, argTypes[i]!);
        if (exactMatch) {
          continue;
        }

        isExact = false;

        const widening = this.ctx.isImplicitWideningAllowed(argTypes[i]!, ft.paramTypes[i]!);
        if (widening) {
          needsWidening = true;
          continue;
        }

        const compatible = this.ctx.areTypesCompatible(ft.paramTypes[i]!, argTypes[i]!);
        if (!compatible) {
          allCompatible = false;
          break;
        }
      }

      if (!allCompatible) continue;

      if (isExact) {
        exactMatches.push(c);
      } else if (needsWidening) {
        wideningMatches.push(c);
      } else {
        compatibleMatches.push(c);
      }
    }

    // Prefer exact matches, then widening, then compatible
    const matched =
      exactMatches.length > 0
        ? exactMatches
        : wideningMatches.length > 0
        ? wideningMatches
        : compatibleMatches;

    if (matched.length > 1) {
      // Sort to prefer non-generic functions
      matched.sort((a, b) => {
        const aIsGeneric = !!a.genericArgs;
        const bIsGeneric = !!b.genericArgs;
        if (aIsGeneric === bIsGeneric) return 0;
        return aIsGeneric ? 1 : -1; // Non-generic first
      });
    }

    if (matched.length === 0) {
      throw new CompilerError(
        `No matching function for call to '${name}' with provided argument types.`,
        `Available overloads:\n${candidates.map((c) => this.ctx.typeToString(c.type!)).join("\n")}`,
        location
      );
    }

    return matched[0]!;
  }

  /**
   * Find an operator overload method on a type
   * Returns the method declaration if found, otherwise undefined
   * Now supports generic types by substituting type parameters
   */
  findOperatorOverload(
    targetType: AST.TypeNode,
    methodName: string,
    paramTypes: AST.TypeNode[],
    resolveMemberWithContext: (
      objectType: AST.BasicTypeNode,
      memberName: string
    ) =>
      | {
          members: (AST.StructField | AST.FunctionDecl)[];
          contextType: AST.BasicTypeNode;
          contextDecl: AST.StructDecl;
        }
      | undefined
  ): AST.FunctionDecl | undefined {
    // Only structs can have operator overloads
    if (targetType.kind !== "BasicType") return undefined;
    // Allow operator overloads on both values and pointers (e.g., Array<T> or *Array<T>)
    // The method signature will specify whether it expects pointer or value
    if (targetType.arrayDimensions.length > 0) return undefined;

    const basicType = targetType as AST.BasicTypeNode;

    // Find the struct declaration
    let decl: AST.StructDecl | undefined;
    if (basicType.resolvedDeclaration) {
      // Only assign if it's a StructDecl, not an EnumDecl
      if (basicType.resolvedDeclaration.kind === "StructDecl") {
        decl = basicType.resolvedDeclaration as AST.StructDecl;
      }
    } else {
      // Look up by base name (works for both "Array" and "Array<T>")
      const baseName = basicType.name;
      const symbol = this.ctx.scope.resolve(baseName);
      if (symbol && symbol.kind === "Struct" && (symbol.declaration as any).kind === "StructDecl") {
        decl = symbol.declaration as AST.StructDecl;
      }
    }

    if (!decl) return undefined;

    // Build type substitution map for generic parameters
    const typeSubstitutionMap = new Map<string, AST.TypeNode>();
    if (basicType.genericArgs.length > 0 && decl.genericParams.length > 0) {
      if (basicType.genericArgs.length !== decl.genericParams.length) {
        // Generic argument count mismatch - should have been caught earlier
        return undefined;
      }

      for (let i = 0; i < decl.genericParams.length; i++) {
        typeSubstitutionMap.set(decl.genericParams[i]!.name, basicType.genericArgs[i]!);
      }
    }

    // Look for the method (including in parent structs)
    const memberContext = resolveMemberWithContext(basicType, methodName);
    if (!memberContext) return undefined;

    const { members } = memberContext;
    const methods = members.filter((m) => m.kind === "FunctionDecl");

    if (methods.length === 0) return undefined;

    // Find matching overload by checking parameter types
    for (const method of methods) {
      const funcDecl = method as AST.FunctionDecl;

      // Skip static methods - operator overloads must be instance methods
      if (funcDecl.isStatic) continue;

      // Check that 'this' parameter type matches the target type
      if (funcDecl.params.length > 0) {
        const thisParam = funcDecl.params[0]!;
        const declaredThisType =
          typeSubstitutionMap.size > 0
            ? this.ctx.substituteType(thisParam.type, typeSubstitutionMap)
            : thisParam.type;

        const resolvedThisType = this.ctx.resolveType(declaredThisType);
        const resolvedTargetType = this.ctx.resolveType(targetType);

        // Check if 'this' type matches target type exactly
        const exactMatch = this.ctx.areTypesCompatible(resolvedThisType, resolvedTargetType);

        // Also allow if 'this' is a pointer to target type
        let pointerMatch = false;
        if (declaredThisType.kind === "BasicType" && targetType.kind === "BasicType") {
          const sameName = declaredThisType.name === targetType.name;
          const pointerDiff = declaredThisType.pointerDepth === targetType.pointerDepth + 1;
          const sameGenericCount =
            declaredThisType.genericArgs.length === targetType.genericArgs.length;

          if (sameName && pointerDiff && sameGenericCount) {
            // Check generic args match
            let argsMatch = true;
            for (let i = 0; i < declaredThisType.genericArgs.length; i++) {
              const thisArg = this.ctx.resolveType(declaredThisType.genericArgs[i]!);
              const targetArg = this.ctx.resolveType(targetType.genericArgs[i]!);
              if (!this.ctx.areTypesCompatible(thisArg, targetArg)) {
                argsMatch = false;
                break;
              }
            }
            pointerMatch = argsMatch;
          }
        }

        if (!exactMatch && !pointerMatch) {
          continue; // Skip this overload, 'this' type doesn't match
        }
      }

      // Check parameter count (excluding 'this')
      const expectedParams = funcDecl.params.slice(1); // Skip 'this'
      if (expectedParams.length !== paramTypes.length) continue;

      // Check parameter types match with generic substitution
      let allMatch = true;
      for (let i = 0; i < paramTypes.length; i++) {
        const declaredParamType = expectedParams[i]!.type;

        // Substitute generic type parameters if present
        const expectedType =
          typeSubstitutionMap.size > 0
            ? this.ctx.substituteType(declaredParamType, typeSubstitutionMap)
            : declaredParamType;

        const resolvedExpected = this.ctx.resolveType(expectedType);
        const resolvedActual = this.ctx.resolveType(paramTypes[i]!);

        if (!this.ctx.areTypesCompatible(resolvedExpected, resolvedActual)) {
          allMatch = false;
          break;
        }
      }

      if (allMatch) {
        return funcDecl;
      }
    }

    return undefined;
  }
}
