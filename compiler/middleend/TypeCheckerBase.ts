/**
 * TypeCheckerBase - Base class with shared state and utility methods for type checking
 * This class provides the foundation for modular type checking with separate
 * expression and statement checkers.
 */

import * as fs from "fs";
import * as path from "path";

import * as AST from "../common/AST";
import { CompilerError, type SourceLocation } from "../common/CompilerError";
import { lexWithGrammar } from "../frontend/GrammarLexer";
import { Parser } from "../frontend/Parser";
import { TokenType } from "../frontend/TokenType";
import { LinkerSymbolTable } from "./LinkerSymbolTable";
import type { Symbol, SymbolKind } from "./SymbolTable";
import { SymbolTable } from "./SymbolTable";
import { initializeBuiltinsInScope } from "./BuiltinTypes";
import {
  TypeUtils,
  TypeSubstitution,
  INTEGER_TYPES,
  KNOWN_TYPES,
  NUMERIC_TYPES,
} from "./TypeUtils";
import { OPERATOR_METHOD_MAP } from "./OverloadResolver";

/**
 * Get the standard library path, using BPL_HOME environment variable if available
 * Falls back to relative path for development mode
 */
export function getStdLibPath(): string {
  const bplHome = process.env.BPL_HOME;
  if (bplHome) {
    return path.join(bplHome, "lib");
  }
  return path.join(__dirname, "../../lib");
}

/**
 * Interface for type checker context - used by checker modules
 */
export interface ITypeCheckerContext {
  // State
  globalScope: SymbolTable;
  currentScope: SymbolTable;
  currentFunctionReturnType: AST.TypeNode | undefined;
  modules: Map<string, SymbolTable>;
  skipImportResolution: boolean;
  preLoadedModules: Map<string, AST.Program>;
  linkerSymbolTable: LinkerSymbolTable;
  currentModulePath: string;
  errors: CompilerError[];
  collectAllErrors: boolean;
  loopDepth: number;

  // Core methods that must be available
  checkExpression(expr: AST.Expression): AST.TypeNode | undefined;
  checkStatement(stmt: AST.Statement): void;
  resolveType(type: AST.TypeNode, checkConstraints?: boolean): AST.TypeNode;
  areTypesCompatible(
    t1: AST.TypeNode,
    t2: AST.TypeNode,
    checkConstraints?: boolean,
  ): boolean;
  typeToString(type: AST.TypeNode | undefined): string;
  defineSymbol(
    name: string,
    kind: SymbolKind,
    type: AST.TypeNode | undefined,
    node: AST.ASTNode,
    moduleScope?: SymbolTable,
  ): void;
  hoistDeclaration(stmt: AST.Statement): void;
}

/**
 * Base class for TypeChecker with shared state and utility methods
 */
export abstract class TypeCheckerBase {
  // ========== State ==========
  protected globalScope: SymbolTable;
  protected currentScope: SymbolTable;
  protected currentFunctionReturnType: AST.TypeNode | undefined;
  protected modules: Map<string, SymbolTable> = new Map();
  protected skipImportResolution: boolean;
  protected preLoadedModules: Map<string, AST.Program> = new Map();
  protected linkerSymbolTable: LinkerSymbolTable;
  protected currentModulePath: string = "unknown";
  protected errors: CompilerError[] = [];
  protected collectAllErrors: boolean = true;
  protected loopDepth: number = 0;

  constructor(
    options: {
      skipImportResolution?: boolean;
      collectAllErrors?: boolean;
    } = {},
  ) {
    this.globalScope = new SymbolTable();
    this.currentScope = this.globalScope;
    this.skipImportResolution = options.skipImportResolution || false;
    this.linkerSymbolTable = new LinkerSymbolTable();
    this.collectAllErrors = options.collectAllErrors ?? true;
    this.initializeBuiltins();
  }

  // ========== Abstract methods - implemented by checker modules ==========
  abstract checkExpression(expr: AST.Expression): AST.TypeNode | undefined;
  abstract checkStatement(stmt: AST.Statement): void;

  // ========== Type Resolution ==========

  public resolveType(
    type: AST.TypeNode,
    checkConstraints: boolean = true,
  ): AST.TypeNode {
    if (type.kind === "BasicType") {
      const symbol = this.currentScope.resolve(type.name);

      if (
        checkConstraints &&
        symbol &&
        (symbol.kind === "Struct" ||
          symbol.kind === "Enum" ||
          symbol.kind === "TypeAlias")
      ) {
        const decl = symbol.declaration as
          | AST.StructDecl
          | AST.EnumDecl
          | AST.TypeAliasDecl;
        if (
          decl &&
          (decl as any).genericParams &&
          (decl as any).genericParams.length > 0
        ) {
          const genericParams = (decl as any)
            .genericParams as AST.GenericParam[];
          if (type.genericArgs.length === genericParams.length) {
            const resolvedArgs = type.genericArgs.map((t) =>
              this.resolveType(t, true),
            );

            const mapping = new Map<string, AST.TypeNode>();
            for (let i = 0; i < genericParams.length; i++) {
              mapping.set(genericParams[i]!.name, resolvedArgs[i]!);
            }

            for (let i = 0; i < genericParams.length; i++) {
              const param = genericParams[i]!;
              const arg = resolvedArgs[i]!;
              if (param.constraint) {
                const substitutedConstraint = this.substituteType(
                  param.constraint,
                  mapping,
                );
                if (
                  !this.areTypesCompatible(substitutedConstraint, arg, false)
                ) {
                  throw new CompilerError(
                    `Type '${this.typeToString(
                      arg,
                    )}' does not satisfy constraint '${this.typeToString(substitutedConstraint)}'`,
                    `Ensure the type argument satisfies the constraint.`,
                    type.location,
                  );
                }
              }
            }
          }
        }
      }

      if (symbol && symbol.kind === "Struct") {
        const resolvedArgs = type.genericArgs.map((t) =>
          this.resolveType(t, checkConstraints),
        );

        const basicType = type as AST.BasicTypeNode;
        basicType.resolvedDeclaration = symbol.declaration as AST.StructDecl;
        basicType.genericArgs = resolvedArgs;

        return basicType;
      }

      if (symbol && symbol.kind === "Enum") {
        const resolvedArgs = type.genericArgs.map((t) =>
          this.resolveType(t, checkConstraints),
        );

        const basicType = type as AST.BasicTypeNode;
        basicType.resolvedDeclaration = symbol.declaration as any;
        basicType.genericArgs = resolvedArgs;

        return basicType;
      }

      if (symbol && symbol.kind === "TypeAlias" && symbol.type) {
        // If the alias points to itself (base type definition), return it
        if (
          symbol.type.kind === "BasicType" &&
          symbol.type.name === type.name
        ) {
          return type;
        }

        const resolvedBase = this.resolveType(symbol.type, checkConstraints);

        if (resolvedBase.kind === "BasicType") {
          return {
            ...resolvedBase,
            genericArgs: [
              ...resolvedBase.genericArgs,
              ...type.genericArgs.map((t) =>
                this.resolveType(t, checkConstraints),
              ),
            ],
            pointerDepth: resolvedBase.pointerDepth + type.pointerDepth,
            arrayDimensions: [
              ...resolvedBase.arrayDimensions,
              ...type.arrayDimensions,
            ],
            location: type.location,
          };
        }
        return resolvedBase;
      }
    } else if (type.kind === "FunctionType") {
      return {
        ...type,
        returnType: this.resolveType(type.returnType, checkConstraints),
        paramTypes: type.paramTypes.map((p) =>
          this.resolveType(p, checkConstraints),
        ),
      };
    } else if (type.kind === "TupleType") {
      return {
        ...type,
        types: type.types.map((t) => this.resolveType(t, checkConstraints)),
      };
    }
    return type;
  }

  public substituteType(
    type: AST.TypeNode,
    map: Map<string, AST.TypeNode>,
  ): AST.TypeNode {
    return TypeSubstitution.substituteType(type, map);
  }

  // ========== Public API ==========

  registerModule(modulePath: string, ast: AST.Program): void {
    this.preLoadedModules.set(modulePath, ast);
  }

  setCurrentModulePath(modulePath: string): void {
    this.currentModulePath = modulePath;
  }

  getLinkerSymbolTable(): LinkerSymbolTable {
    return this.linkerSymbolTable;
  }

  getErrors(): CompilerError[] {
    return this.errors;
  }

  // ========== Initialization ==========

  protected initializeBuiltins(): void {
    initializeBuiltinsInScope(this.globalScope);
  }

  // ========== Linker Symbol Registration ==========

  protected registerLinkerSymbol(
    name: string,
    kind: "function" | "variable" | "type",
    type?: AST.TypeNode,
    declaration?: AST.ASTNode,
    isExtern: boolean = false,
  ): void {
    this.linkerSymbolTable.defineSymbol({
      name,
      kind,
      module: this.currentModulePath,
      isExported: false,
      type,
      declaration,
      isExtern,
      location: declaration?.location,
    });
  }

  // ========== Type Utilities ==========

  protected typeToString(type: AST.TypeNode | undefined): string {
    return TypeUtils.typeToString(type);
  }

  protected isIntegerType(type: AST.TypeNode): boolean {
    return TypeUtils.isIntegerType(type);
  }

  protected isComparisonOperator(op: TokenType): boolean {
    return TypeUtils.isComparisonOperator(op);
  }

  protected isBoolType(type: AST.TypeNode): boolean {
    return TypeUtils.isBoolType(type);
  }

  protected makeVoidType(): AST.TypeNode {
    return TypeUtils.makeVoidType();
  }

  protected getIntegerConstantValue(expr: AST.Expression): bigint | undefined {
    return TypeUtils.getIntegerConstantValue(expr);
  }

  protected isIntegerTypeCompatible(
    val: bigint,
    targetType: AST.TypeNode,
  ): boolean {
    return TypeUtils.isIntegerTypeCompatible(val, targetType, (t) =>
      this.resolveType(t),
    );
  }

  protected getIntegerSize(type: AST.TypeNode): number {
    return TypeUtils.getIntegerSize(type);
  }

  protected substituteType(
    type: AST.TypeNode,
    map: Map<string, AST.TypeNode>,
  ): AST.TypeNode {
    return TypeSubstitution.substituteType(type, map);
  }

  // ========== Symbol Management ==========

  protected defineSymbol(
    name: string,
    kind: SymbolKind,
    type: AST.TypeNode | undefined,
    node: AST.ASTNode,
    moduleScope?: SymbolTable,
  ): void {
    const existing = this.currentScope.getInCurrentScope(name);

    if (
      existing &&
      existing.kind === "Function" &&
      kind === "Function" &&
      type &&
      type.kind === "FunctionType"
    ) {
      const candidates = [existing, ...(existing.overloads || [])];
      for (const cand of candidates) {
        if (cand.type && cand.type.kind === "FunctionType") {
          if (
            this.areSignaturesEqual(
              cand.type as AST.FunctionTypeNode,
              type as AST.FunctionTypeNode,
            )
          ) {
            throw new CompilerError(
              `Function '${name}' with this signature is already defined.`,
              "Overloads must have different parameter types.",
              node.location,
            );
          }
        }
      }
    }

    this.currentScope.define({
      name,
      kind,
      type,
      declaration: node,
      moduleScope,
    });
  }

  protected defineImportedSymbol(
    name: string,
    symbol: Symbol,
    scope?: SymbolTable,
  ): void {
    const targetScope = scope || this.currentScope;

    targetScope.define({
      name,
      kind: symbol.kind,
      type: symbol.type,
      declaration: symbol.declaration,
      moduleScope: symbol.moduleScope,
    });

    if (symbol.overloads) {
      for (const overload of symbol.overloads) {
        targetScope.define({
          name,
          kind: overload.kind,
          type: overload.type,
          declaration: overload.declaration,
          moduleScope: overload.moduleScope,
        });
      }
    }
  }

  // ========== Type Resolution ==========

  protected resolveType(
    type: AST.TypeNode,
    checkConstraints: boolean = true,
  ): AST.TypeNode {
    if (type.kind === "BasicType") {
      const symbol = this.currentScope.resolve(type.name);

      if (
        checkConstraints &&
        symbol &&
        (symbol.kind === "Struct" ||
          symbol.kind === "Enum" ||
          symbol.kind === "TypeAlias")
      ) {
        const decl = symbol.declaration as
          | AST.StructDecl
          | AST.EnumDecl
          | AST.TypeAliasDecl;
        if (
          decl &&
          (decl as any).genericParams &&
          (decl as any).genericParams.length > 0
        ) {
          const genericParams = (decl as any)
            .genericParams as AST.GenericParam[];
          if (type.genericArgs.length === genericParams.length) {
            const resolvedArgs = type.genericArgs.map((t) =>
              this.resolveType(t, true),
            );

            const mapping = new Map<string, AST.TypeNode>();
            for (let i = 0; i < genericParams.length; i++) {
              mapping.set(genericParams[i]!.name, resolvedArgs[i]!);
            }

            for (let i = 0; i < genericParams.length; i++) {
              const param = genericParams[i]!;
              const arg = resolvedArgs[i]!;
              if (param.constraint) {
                const substitutedConstraint = this.substituteType(
                  param.constraint,
                  mapping,
                );
                if (
                  !this.areTypesCompatible(substitutedConstraint, arg, false)
                ) {
                  throw new CompilerError(
                    `Type '${this.typeToString(
                      arg,
                    )}' does not satisfy constraint '${this.typeToString(substitutedConstraint)}'`,
                    `Ensure the type argument satisfies the constraint.`,
                    type.location,
                  );
                }
              }
            }
          }
        }
      }

      if (symbol && symbol.kind === "Struct") {
        const resolvedArgs = type.genericArgs.map((t) =>
          this.resolveType(t, checkConstraints),
        );
        const basicType = type as AST.BasicTypeNode;
        basicType.resolvedDeclaration = symbol.declaration as AST.StructDecl;
        basicType.genericArgs = resolvedArgs;
        return basicType;
      }

      if (symbol && symbol.kind === "Enum") {
        const resolvedArgs = type.genericArgs.map((t) =>
          this.resolveType(t, checkConstraints),
        );
        const basicType = type as AST.BasicTypeNode;
        basicType.resolvedDeclaration = symbol.declaration as any;
        basicType.genericArgs = resolvedArgs;
        return basicType;
      }

      if (symbol && symbol.kind === "Spec") {
        const resolvedArgs = type.genericArgs.map((t) =>
          this.resolveType(t, checkConstraints),
        );
        const basicType = type as AST.BasicTypeNode;
        basicType.resolvedDeclaration = symbol.declaration as any;
        basicType.genericArgs = resolvedArgs;
        return basicType;
      }

      if (symbol && symbol.kind === "TypeAlias" && symbol.type) {
        if (
          symbol.type.kind === "BasicType" &&
          symbol.type.name === type.name
        ) {
          return type;
        }

        const resolvedBase = this.resolveType(symbol.type, checkConstraints);

        if (resolvedBase.kind === "BasicType") {
          return {
            ...resolvedBase,
            genericArgs: [
              ...resolvedBase.genericArgs,
              ...type.genericArgs.map((t) =>
                this.resolveType(t, checkConstraints),
              ),
            ],
            pointerDepth: resolvedBase.pointerDepth + type.pointerDepth,
            arrayDimensions: [
              ...resolvedBase.arrayDimensions,
              ...type.arrayDimensions,
            ],
          };
        }

        return resolvedBase;
      }

      if (type.genericArgs.length > 0) {
        return {
          ...type,
          genericArgs: type.genericArgs.map((t) =>
            this.resolveType(t, checkConstraints),
          ),
        };
      }

      return type;
    } else if (type.kind === "TupleType") {
      return {
        ...type,
        types: type.types.map((t) => this.resolveType(t, checkConstraints)),
      };
    } else if (type.kind === "FunctionType") {
      return {
        ...type,
        returnType: this.resolveType(type.returnType, checkConstraints),
        paramTypes: type.paramTypes.map((t) =>
          this.resolveType(t, checkConstraints),
        ),
      };
    }

    return type;
  }

  // ========== Type Compatibility ==========

  protected getIntegerBits(typeName: string): number {
    const aliases: { [key: string]: string } = {
      long: "i64",
      ulong: "u64",
      int: "i32",
      uint: "u32",
      short: "i16",
      ushort: "u16",
      char: "i8",
      uchar: "u8",
      bool: "i1",
    };
    const name = aliases[typeName] || typeName;
    if (name === "i1") return 1;
    if (name === "i8" || name === "u8") return 8;
    if (name === "i16" || name === "u16") return 16;
    if (name === "i32" || name === "u32") return 32;
    if (name === "i64" || name === "u64") return 64;
    return 0;
  }

  protected areTypesCompatible(
    t1: AST.TypeNode,
    t2: AST.TypeNode,
    checkConstraints: boolean = true,
  ): boolean {
    const rt1 = this.resolveType(t1, checkConstraints);
    const rt2 = this.resolveType(t2, checkConstraints);

    if (rt1.kind !== rt2.kind) {
      return false;
    }

    if (rt1.kind === "BasicType" && rt2.kind === "BasicType") {
      // nullptr handling
      if (rt1.name === "nullptr" && rt2.name === "nullptr") return true;
      if (rt2.name === "nullptr") return rt1.pointerDepth > 0;
      if (rt1.name === "nullptr") return rt2.pointerDepth > 0;

      // null handling
      if (rt1.name === "null" || rt2.name === "null") {
        const other = rt1.name === "null" ? rt2 : rt1;
        if (other.pointerDepth > 0) return true;
        return other.pointerDepth === 0 && this.isStructType(other.name);
      }

      // Void handling
      if (rt1.name === "void" && rt2.name === "void") return true;

      // void* compatibility
      if (
        (rt1.name === "void" || rt2.name === "void") &&
        rt1.pointerDepth > 0 &&
        rt2.pointerDepth > 0
      ) {
        return true;
      }

      // Check integer compatibility (implicit casts)
      const size1 = this.getIntegerBits(rt1.name);
      const size2 = this.getIntegerBits(rt2.name);

      if (
        size1 > 0 &&
        size2 > 0 &&
        rt1.pointerDepth === 0 &&
        rt2.pointerDepth === 0 &&
        rt1.arrayDimensions.length === 0 &&
        rt2.arrayDimensions.length === 0
      ) {
        return true;
      }

      // Exact name match or inheritance
      if (rt1.name !== rt2.name) {
        // Check aliases
        const aliases: { [key: string]: string } = {
          long: "i64",
          ulong: "u64",
          int: "i32",
          uint: "u32",
          short: "i16",
          ushort: "u16",
          char: "i8",
          uchar: "u8",
        };
        const n1 = aliases[rt1.name] || rt1.name;
        const n2 = aliases[rt2.name] || rt2.name;
        const isAlias = n1 === n2;

        if (
          !isAlias &&
          !this.isSubtype(rt2 as AST.BasicTypeNode, rt1 as AST.BasicTypeNode)
        ) {
          return false;
        }
      }

      // Check generic arguments compatibility
      const symbol1 = this.currentScope.resolve(rt1.name);
      let isWildcard = false;
      if (
        symbol1 &&
        symbol1.kind === "Struct" &&
        (symbol1.declaration as AST.StructDecl).genericParams.length > 0 &&
        rt1.genericArgs.length === 0
      ) {
        isWildcard = true;
      }

      // Pointer depth match
      if (rt1.pointerDepth !== rt2.pointerDepth) {
        if (
          rt1.pointerDepth === rt2.pointerDepth + 1 &&
          rt2.arrayDimensions.length > 0 &&
          rt1.arrayDimensions.length === rt2.arrayDimensions.length - 1
        ) {
          // array decay
        } else {
          return false;
        }
      } else {
        if (rt1.arrayDimensions.length !== rt2.arrayDimensions.length) {
          return false;
        }
        for (let i = 0; i < rt1.arrayDimensions.length; i++) {
          if (rt1.arrayDimensions[i] !== rt2.arrayDimensions[i]) {
            return false;
          }
        }
      }

      // Generic args match
      if (!isWildcard) {
        if (rt1.genericArgs.length !== rt2.genericArgs.length) {
          return false;
        }
        for (let i = 0; i < rt1.genericArgs.length; i++) {
          if (
            !this.areTypesCompatible(rt1.genericArgs[i]!, rt2.genericArgs[i]!)
          ) {
            return false;
          }
        }
      }

      return true;
    } else if (rt1.kind === "FunctionType" && rt2.kind === "FunctionType") {
      if (!this.areTypesCompatible(rt1.returnType, rt2.returnType))
        return false;
      if (rt1.paramTypes.length !== rt2.paramTypes.length) return false;
      for (let i = 0; i < rt1.paramTypes.length; i++) {
        if (!this.areTypesCompatible(rt1.paramTypes[i]!, rt2.paramTypes[i]!))
          return false;
      }
      return true;
    } else if (rt1.kind === "TupleType" && rt2.kind === "TupleType") {
      if (rt1.types.length !== rt2.types.length) return false;
      for (let i = 0; i < rt1.types.length; i++) {
        if (!this.areTypesCompatible(rt1.types[i]!, rt2.types[i]!))
          return false;
      }
      return true;
    }

    return false;
  }

  protected areTypesExactMatch(t1: AST.TypeNode, t2: AST.TypeNode): boolean {
    const rt1 = this.resolveType(t1, false);
    const rt2 = this.resolveType(t2, false);

    if (rt1.kind !== rt2.kind) return false;

    if (rt1.kind === "BasicType" && rt2.kind === "BasicType") {
      if (rt1.name !== rt2.name) return false;
      if (rt1.pointerDepth !== rt2.pointerDepth) return false;
      if (rt1.arrayDimensions.length !== rt2.arrayDimensions.length)
        return false;
      for (let i = 0; i < rt1.arrayDimensions.length; i++) {
        if (rt1.arrayDimensions[i] !== rt2.arrayDimensions[i]) return false;
      }
      if (rt1.genericArgs.length !== rt2.genericArgs.length) return false;
      for (let i = 0; i < rt1.genericArgs.length; i++) {
        if (!this.areTypesExactMatch(rt1.genericArgs[i]!, rt2.genericArgs[i]!))
          return false;
      }
      return true;
    } else if (rt1.kind === "FunctionType" && rt2.kind === "FunctionType") {
      if (!this.areTypesExactMatch(rt1.returnType, rt2.returnType))
        return false;
      if (rt1.paramTypes.length !== rt2.paramTypes.length) return false;
      for (let i = 0; i < rt1.paramTypes.length; i++) {
        if (!this.areTypesExactMatch(rt1.paramTypes[i]!, rt2.paramTypes[i]!))
          return false;
      }
      return true;
    } else if (rt1.kind === "TupleType" && rt2.kind === "TupleType") {
      if (rt1.types.length !== rt2.types.length) return false;
      for (let i = 0; i < rt1.types.length; i++) {
        if (!this.areTypesExactMatch(rt1.types[i]!, rt2.types[i]!))
          return false;
      }
      return true;
    }

    return false;
  }

  protected areSignaturesEqual(
    f1: AST.FunctionTypeNode,
    f2: AST.FunctionTypeNode,
  ): boolean {
    if (f1.paramTypes.length !== f2.paramTypes.length) return false;
    for (let i = 0; i < f1.paramTypes.length; i++) {
      if (!this.areTypesExactMatch(f1.paramTypes[i]!, f2.paramTypes[i]!))
        return false;
    }
    return true;
  }

  // ========== Struct/Type Helpers ==========

  protected isStructType(typeName: string): boolean {
    const symbol = this.currentScope.resolve(typeName);
    return symbol !== undefined && symbol.kind === "Struct";
  }

  protected isSubtype(
    child: AST.BasicTypeNode,
    parent: AST.BasicTypeNode,
  ): boolean {
    if (child.name === parent.name) return true;

    const childSymbol = this.currentScope.resolve(child.name);
    if (!childSymbol || childSymbol.kind !== "Struct") return false;

    const childDecl = childSymbol.declaration as AST.StructDecl;
    if (!childDecl.inheritanceList || childDecl.inheritanceList.length === 0)
      return false;

    // First element in inheritanceList is the parent struct (if any)
    const parentType = childDecl.inheritanceList[0] as AST.BasicTypeNode;
    if (parentType.name === parent.name) return true;

    // Check inheritance chain
    let current: AST.BasicTypeNode | undefined = parentType;
    while (current) {
      if (current.name === parent.name) return true;
      const currentSymbol = this.currentScope.resolve(current.name);
      if (!currentSymbol || currentSymbol.kind !== "Struct") break;
      const currentDecl = currentSymbol.declaration as AST.StructDecl;
      if (
        !currentDecl.inheritanceList ||
        currentDecl.inheritanceList.length === 0
      )
        break;
      current = currentDecl.inheritanceList[0] as AST.BasicTypeNode | undefined;
    }

    return false;
  }

  protected resolveStructField(
    decl: AST.StructDecl,
    fieldName: string,
  ): AST.StructField | undefined {
    for (const member of decl.members) {
      if (member.kind === "StructField" && member.name === fieldName) {
        return member;
      }
    }

    if (decl.inheritanceList && decl.inheritanceList.length > 0) {
      const parentType = decl.inheritanceList[0];
      if (parentType && parentType.kind === "BasicType") {
        const parentSymbol = this.currentScope.resolve(parentType.name);
        if (parentSymbol && parentSymbol.kind === "Struct") {
          return this.resolveStructField(
            parentSymbol.declaration as AST.StructDecl,
            fieldName,
          );
        }
      }
    }

    return undefined;
  }

  protected resolveMemberWithContext(
    baseType: AST.BasicTypeNode,
    memberName: string,
  ):
    | {
        decl: AST.StructDecl | AST.SpecDecl;
        members: (AST.StructField | AST.FunctionDecl | AST.SpecMethod)[];
        genericMap: Map<string, AST.TypeNode>;
      }
    | undefined {
    let decl: AST.StructDecl | AST.SpecDecl | undefined;

    if (
      baseType.resolvedDeclaration &&
      ((baseType.resolvedDeclaration as any).kind === "StructDecl" ||
        (baseType.resolvedDeclaration as any).kind === "SpecDecl")
    ) {
      decl = baseType.resolvedDeclaration as AST.StructDecl | AST.SpecDecl;
    } else {
      const symbol = this.currentScope.resolve(baseType.name);
      if (symbol) {
        if (symbol.kind === "Struct") {
          decl = symbol.declaration as AST.StructDecl;
        } else if (symbol.kind === "Spec") {
          decl = symbol.declaration as AST.SpecDecl;
        } else if (symbol.kind === "TypeAlias") {
          // Check if it's a generic parameter with a constraint
          const aliasDecl = symbol.declaration as any;
          if (aliasDecl.kind === "GenericParam" && aliasDecl.constraint) {
            if (aliasDecl.constraint.kind === "BasicType") {
              return this.resolveMemberWithContext(
                aliasDecl.constraint as AST.BasicTypeNode,
                memberName,
              );
            }
          }
        }
      }
    }

    if (!decl) return undefined;

    let members: (AST.StructField | AST.FunctionDecl | AST.SpecMethod)[] = [];

    if (decl.kind === "StructDecl") {
      members = (decl as AST.StructDecl).members.filter(
        (m) =>
          (m.kind === "StructField" && m.name === memberName) ||
          (m.kind === "FunctionDecl" && m.name === memberName),
      );
    } else {
      members = (decl as AST.SpecDecl).methods.filter(
        (m) => m.name === memberName,
      );
    }

    if (members.length > 0) {
      const genericMap = new Map<string, AST.TypeNode>();
      if (decl.genericParams.length > 0 && baseType.genericArgs.length > 0) {
        for (let i = 0; i < decl.genericParams.length; i++) {
          genericMap.set(decl.genericParams[i]!.name, baseType.genericArgs[i]!);
        }
      }

      if (decl.kind === "SpecDecl") {
        // Map Self to the spec type itself when accessing members on the spec type
        genericMap.set("Self", baseType);
      }

      return { decl, members, genericMap };
    }

    // Check parent struct via inheritanceList
    if (
      decl.kind === "StructDecl" &&
      decl.inheritanceList &&
      decl.inheritanceList.length > 0
    ) {
      let parentType = decl.inheritanceList[0];
      if (parentType && parentType.kind === "BasicType") {
        // Substitute generics in parent type if we have a map
        const currentGenericMap = new Map<string, AST.TypeNode>();
        if (decl.genericParams.length > 0 && baseType.genericArgs.length > 0) {
          for (let i = 0; i < decl.genericParams.length; i++) {
            currentGenericMap.set(
              decl.genericParams[i]!.name,
              baseType.genericArgs[i]!,
            );
          }
        }

        if (currentGenericMap.size > 0) {
          parentType = this.substituteType(
            parentType,
            currentGenericMap,
          ) as AST.BasicTypeNode;
        }

        return this.resolveMemberWithContext(
          parentType as AST.BasicTypeNode,
          memberName,
        );
      }
    }

    return undefined;
  }

  // ========== Cast Checking ==========

  protected isCastAllowed(source: AST.TypeNode, target: AST.TypeNode): boolean {
    const resolvedSource = this.resolveType(source);
    const resolvedTarget = this.resolveType(target);

    if (this.areTypesCompatible(resolvedSource, resolvedTarget)) return true;

    // Allow casting between function pointers and void pointers (or any pointer)
    if (
      (resolvedSource.kind === "FunctionType" &&
        resolvedTarget.kind === "BasicType" &&
        resolvedTarget.pointerDepth > 0) ||
      (resolvedSource.kind === "BasicType" &&
        resolvedSource.pointerDepth > 0 &&
        resolvedTarget.kind === "FunctionType")
    ) {
      return true;
    }

    if (
      resolvedSource.kind === "BasicType" &&
      resolvedTarget.kind === "BasicType"
    ) {
      // Numeric casts
      if (
        NUMERIC_TYPES.includes(resolvedSource.name) &&
        NUMERIC_TYPES.includes(resolvedTarget.name) &&
        resolvedSource.pointerDepth === 0 &&
        resolvedTarget.pointerDepth === 0
      ) {
        return true;
      }

      // Pointer casts
      if (resolvedSource.pointerDepth > 0 && resolvedTarget.pointerDepth > 0) {
        return true;
      }

      // Pointer to int / int to pointer
      if (
        (resolvedSource.pointerDepth > 0 &&
          ["i64", "u64", "long", "ulong", "int", "uint", "i32", "u32"].includes(
            resolvedTarget.name,
          )) ||
        (resolvedTarget.pointerDepth > 0 &&
          ["i64", "u64", "long", "ulong", "int", "uint", "i32", "u32"].includes(
            resolvedSource.name,
          ))
      ) {
        return true;
      }
    }

    return false;
  }

  protected isImplicitWideningAllowed(
    source: AST.TypeNode,
    target: AST.TypeNode,
  ): boolean {
    const rs = this.resolveType(source);
    const rt = this.resolveType(target);

    if (rs.kind !== "BasicType" || rt.kind !== "BasicType") return false;
    if (rs.pointerDepth !== 0 || rt.pointerDepth !== 0) return false;

    const sourceSize = this.getIntegerSize(rs);
    const targetSize = this.getIntegerSize(rt);

    if (sourceSize === 0 || targetSize === 0) return false;

    // Same signedness, target larger or equal
    const sourceIsSigned = [
      "i8",
      "i16",
      "i32",
      "i64",
      "char",
      "short",
      "int",
      "long",
    ].includes(rs.name);
    const targetIsSigned = [
      "i8",
      "i16",
      "i32",
      "i64",
      "char",
      "short",
      "int",
      "long",
    ].includes(rt.name);

    if (sourceIsSigned === targetIsSigned && targetSize >= sourceSize) {
      return true;
    }

    // Unsigned to larger signed is also allowed
    if (!sourceIsSigned && targetIsSigned && targetSize > sourceSize) {
      return true;
    }

    return false;
  }

  // ========== Scope Management ==========

  protected enterScope(): void {
    this.currentScope = this.currentScope.enterScope();
  }

  protected exitScope(): void {
    this.currentScope = this.currentScope.exitScope();
  }
}
