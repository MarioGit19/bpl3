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

export class TypeChecker {
  private globalScope: SymbolTable;
  private currentScope: SymbolTable;
  private currentFunctionReturnType: AST.TypeNode | undefined;
  private modules: Map<string, SymbolTable> = new Map();
  private skipImportResolution: boolean;
  private preLoadedModules: Map<string, AST.Program> = new Map();
  private linkerSymbolTable: LinkerSymbolTable;
  private currentModulePath: string = "unknown";
  private errors: CompilerError[] = [];
  private collectAllErrors: boolean = true;
  private loopDepth: number = 0; // Track nesting depth for break/continue validation

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

  /**
   * Pre-register modules that have been resolved by ModuleResolver
   */
  registerModule(modulePath: string, ast: AST.Program): void {
    this.preLoadedModules.set(modulePath, ast);
  }

  /**
   * Set current module path for symbol tracking
   */
  setCurrentModulePath(modulePath: string): void {
    this.currentModulePath = modulePath;
  }

  /**
   * Get the linker symbol table
   */
  getLinkerSymbolTable(): LinkerSymbolTable {
    return this.linkerSymbolTable;
  }

  /**
   * Get collected type checking errors
   */
  getErrors(): CompilerError[] {
    return this.errors;
  }

  /**
   * Register a symbol with the linker
   */
  private registerLinkerSymbol(
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

  private initializeBuiltins() {
    this.initializeBuiltinsInScope(this.globalScope);
  }

  private initializeBuiltinsInScope(scope: SymbolTable) {
    const baseTypes = [
      "i1",
      "i8",
      "u8",
      "i16",
      "u16",
      "i32",
      "u32",
      "i64",
      "u64",
      "double",
      "void",
      "null",
      "nullptr",
    ];

    const internalLoc = {
      file: "internal",
      startLine: 0,
      startColumn: 0,
      endLine: 0,
      endColumn: 0,
    };

    for (const name of baseTypes) {
      scope.define({
        name,
        kind: "TypeAlias",
        type: {
          kind: "BasicType",
          name,
          genericArgs: [],
          pointerDepth: 0,
          arrayDimensions: [],
          location: internalLoc,
        },
        declaration: {
          kind: "TypeAlias",
          location: internalLoc,
          name,
          type: {
            kind: "BasicType",
            name,
            genericArgs: [],
            pointerDepth: 0,
            arrayDimensions: [],
            location: internalLoc,
          },
        } as any,
      });
    }

    const aliases: [string, string][] = [
      ["int", "i32"],
      ["uint", "u32"],
      ["float", "double"],
      ["bool", "i1"],
      ["char", "i8"],
      ["uchar", "u8"],
      ["short", "i16"],
      ["ushort", "u16"],
      ["long", "i64"],
      ["ulong", "u64"],
    ];

    for (const [alias, target] of aliases) {
      scope.define({
        name: alias,
        kind: "TypeAlias",
        type: {
          kind: "BasicType",
          name: target,
          genericArgs: [],
          pointerDepth: 0,
          arrayDimensions: [],
          location: internalLoc,
        },
        declaration: {
          kind: "TypeAlias",
          location: internalLoc,
          name: alias,
          type: {
            kind: "BasicType",
            name: target,
            genericArgs: [],
            pointerDepth: 0,
            arrayDimensions: [],
            location: internalLoc,
          },
        } as any,
      });
    }

    scope.define({
      name: "string",
      kind: "TypeAlias",
      type: {
        kind: "BasicType",
        name: "i8",
        genericArgs: [],
        pointerDepth: 1,
        arrayDimensions: [],
        location: internalLoc,
      },
      declaration: {
        kind: "TypeAlias",
        location: internalLoc,
        name: "string",
        type: {
          kind: "BasicType",
          name: "i8",
          genericArgs: [],
          pointerDepth: 1,
          arrayDimensions: [],
          location: internalLoc,
        },
      } as any,
    });

    // Register NullAccessError struct type
    const nullAccessErrorDecl: AST.StructDecl = {
      kind: "StructDecl",
      name: "NullAccessError",
      genericParams: [],
      inheritanceList: [],
      members: [
        {
          kind: "StructField",
          name: "message",
          type: {
            kind: "BasicType",
            name: "i8",
            genericArgs: [],
            pointerDepth: 1,
            arrayDimensions: [],
            location: internalLoc,
          },
          location: internalLoc,
        },
        {
          kind: "StructField",
          name: "function",
          type: {
            kind: "BasicType",
            name: "i8",
            genericArgs: [],
            pointerDepth: 1,
            arrayDimensions: [],
            location: internalLoc,
          },
          location: internalLoc,
        },
        {
          kind: "StructField",
          name: "expression",
          type: {
            kind: "BasicType",
            name: "i8",
            genericArgs: [],
            pointerDepth: 1,
            arrayDimensions: [],
            location: internalLoc,
          },
          location: internalLoc,
        },
      ],
      location: internalLoc,
    };

    scope.define({
      name: "NullAccessError",
      kind: "Struct",
      type: {
        kind: "BasicType",
        name: "NullAccessError",
        genericArgs: [],
        pointerDepth: 0,
        arrayDimensions: [],
        location: internalLoc,
      },
      declaration: nullAccessErrorDecl,
    });
  }

  public checkProgram(program: AST.Program, modulePath?: string): void {
    // Create a new scope for this module
    const moduleScope = new SymbolTable(this.globalScope);
    this.currentScope = moduleScope;

    if (modulePath) {
      this.modules.set(modulePath, moduleScope);
    }

    // Pass 1: Hoist declarations (Structs, Functions, TypeAliases, Externs)
    for (const stmt of program.statements) {
      try {
        this.hoistDeclaration(stmt);
      } catch (e) {
        if (this.collectAllErrors && e instanceof CompilerError) {
          this.errors.push(e);
          continue;
        }
        throw e;
      }
    }

    // Pass 2: Check bodies
    for (const stmt of program.statements) {
      try {
        this.checkStatement(stmt);
      } catch (e) {
        if (this.collectAllErrors && e instanceof CompilerError) {
          this.errors.push(e);
          continue;
        }
        throw e;
      }
    }
  }

  private hoistDeclaration(stmt: AST.Statement): void {
    switch (stmt.kind) {
      case "StructDecl":
        this.defineSymbol(stmt.name, "Struct", undefined, stmt);
        this.registerLinkerSymbol(stmt.name, "type", undefined, stmt);
        stmt.resolvedType = {
          kind: "BasicType",
          name: stmt.name,
          genericArgs: [],
          pointerDepth: 0,
          arrayDimensions: [],
          location: stmt.location,
        };
        break;
      case "SpecDecl":
        this.defineSymbol(stmt.name, "Spec", undefined, stmt);
        this.registerLinkerSymbol(stmt.name, "type", undefined, stmt);
        break;
      case "FunctionDecl":
        const functionType: AST.FunctionTypeNode = {
          kind: "FunctionType",
          returnType: this.resolveType(stmt.returnType),
          paramTypes: stmt.params.map((p) => this.resolveType(p.type)),
          location: stmt.location,
          declaration: stmt,
        };
        this.defineSymbol(stmt.name, "Function", functionType, stmt);
        this.registerLinkerSymbol(stmt.name, "function", functionType, stmt);
        stmt.resolvedType = functionType;
        break;
      case "TypeAlias":
        this.defineSymbol(
          stmt.name,
          "TypeAlias",
          this.resolveType(stmt.type),
          stmt,
        );
        break;
      case "Extern":
        const externType: AST.FunctionTypeNode = {
          kind: "FunctionType",
          returnType: stmt.returnType
            ? this.resolveType(stmt.returnType)
            : {
                kind: "BasicType",
                name: "void",
                genericArgs: [],
                pointerDepth: 0,
                arrayDimensions: [],
                location: stmt.location,
              },
          paramTypes: stmt.params.map((p) => this.resolveType(p.type)),
          isVariadic: stmt.isVariadic,
          location: stmt.location,
        };
        this.defineSymbol(stmt.name, "Function", externType, stmt);
        this.registerLinkerSymbol(
          stmt.name,
          "function",
          externType,
          stmt,
          true,
        );
        stmt.resolvedType = externType;
        break;
      case "Import":
        // Imports should also be hoisted or processed first
        this.checkImport(stmt);
        break;
    }
  }

  private checkStatement(stmt: AST.Statement): void {
    switch (stmt.kind) {
      case "VariableDecl":
        this.checkVariableDecl(stmt);
        break;
      case "FunctionDecl":
        this.checkFunctionBody(stmt);
        break; // Changed to check body only
      case "StructDecl":
        this.checkStructBody(stmt);
        break; // Changed to check body only
      case "SpecDecl":
        this.checkSpecBody(stmt);
        break;
      case "TypeAlias":
        if (this.currentScope !== this.globalScope) {
          this.defineSymbol(
            stmt.name,
            "TypeAlias",
            this.resolveType(stmt.type),
            stmt,
          );
        }
        break;
      case "Block":
        this.checkBlock(stmt);
        break;
      case "If":
        this.checkIf(stmt);
        break;
      case "Loop":
        this.checkLoop(stmt);
        break;
      case "Return":
        this.checkReturn(stmt);
        break;
      case "ExpressionStmt":
        this.checkExpression(stmt.expression);
        break;
      // ... other statements
      case "Import":
        break; // Already hoisted
      case "Export":
        break; // No runtime type checking needed for exports
      case "Extern":
        break; // Already hoisted
      case "Asm":
        break; // Unsafe
      case "Break":
        if (this.loopDepth === 0) {
          throw new CompilerError(
            "Break statement outside of loop",
            "Break can only be used inside a loop or switch statement.",
            stmt.location,
          );
        }
        break;
      case "Continue":
        if (this.loopDepth === 0) {
          throw new CompilerError(
            "Continue statement outside of loop",
            "Continue can only be used inside a loop statement.",
            stmt.location,
          );
        }
        break;
      case "Try":
        this.checkTry(stmt);
        break;
      case "Throw":
        this.checkThrow(stmt);
        break;
      case "Switch":
        this.checkSwitch(stmt);
        break;
    }
  }

  private getIntegerConstantValue(expr: AST.Expression): bigint | undefined {
    if (
      expr.kind === "Literal" &&
      (expr as AST.LiteralExpr).type === "number"
    ) {
      try {
        return BigInt((expr as AST.LiteralExpr).raw);
      } catch {
        return undefined;
      }
    }
    if (expr.kind === "Unary" && expr.operator.type === TokenType.Minus) {
      const val = this.getIntegerConstantValue(expr.operand);
      if (val !== undefined) return -val;
    }
    return undefined;
  }

  private isIntegerTypeCompatible(
    val: bigint,
    targetType: AST.TypeNode,
  ): boolean {
    const resolvedTarget = this.resolveType(targetType);
    if (resolvedTarget.kind !== "BasicType") return false;

    // Check if target is integer type
    const intTypes = [
      "i8",
      "u8",
      "i16",
      "u16",
      "i32",
      "u32",
      "i64",
      "u64",
      "char",
      "uchar",
      "short",
      "ushort",
      "int",
      "uint",
      "long",
      "ulong",
    ];
    if (!intTypes.includes(resolvedTarget.name)) return false;

    let min = 0n;
    let max = 0n;

    switch (resolvedTarget.name) {
      case "i8":
      case "char":
        min = -128n;
        max = 127n;
        break;
      case "u8":
      case "uchar":
        min = 0n;
        max = 255n;
        break;
      case "i16":
      case "short":
        min = -32768n;
        max = 32767n;
        break;
      case "u16":
      case "ushort":
        min = 0n;
        max = 65535n;
        break;
      case "i32":
      case "int":
        min = -2147483648n;
        max = 2147483647n;
        break;
      case "u32":
      case "uint":
        min = 0n;
        max = 4294967295n;
        break;
      case "i64":
      case "long":
        min = -9223372036854775808n;
        max = 9223372036854775807n;
        break;
      case "u64":
      case "ulong":
        min = 0n;
        max = 18446744073709551615n;
        break;
      default:
        return false;
    }

    return val >= min && val <= max;
  }

  private checkVariableDecl(decl: AST.VariableDecl): void {
    if (Array.isArray(decl.name)) {
      // Destructuring - recursively flatten nested targets
      const flattenTargets = (
        targets: any[],
      ): { name: string; type?: AST.TypeNode }[] => {
        const result: { name: string; type?: AST.TypeNode }[] = [];
        for (const target of targets) {
          if (Array.isArray(target)) {
            result.push(...flattenTargets(target));
          } else {
            result.push(target);
          }
        }
        return result;
      };

      const flatTargets = flattenTargets(decl.name);
      for (const target of flatTargets) {
        this.defineSymbol(target.name, "Variable", target.type, decl);
      }
      if (decl.initializer) {
        const initType = this.checkExpression(decl.initializer);

        // Helper to recursively check tuple destructuring structure
        const checkDestructuringMatch = (
          targets: any[],
          tupleType: AST.TypeNode,
          path: string = "root",
        ): void => {
          if (!tupleType || tupleType.kind !== "TupleType") {
            throw new CompilerError(
              `Cannot destructure non-tuple type: ${this.typeToString(tupleType)}`,
              "Tuple destructuring requires a tuple value.",
              decl.location,
            );
          }

          const tt = tupleType as AST.TupleTypeNode;
          if (tt.types.length !== targets.length) {
            throw new CompilerError(
              `Tuple destructuring arity mismatch at ${path}: expected ${targets.length} elements, got ${tt.types.length}`,
              "The number of variables must match the tuple size.",
              decl.location,
            );
          }

          for (let i = 0; i < targets.length; i++) {
            const target = targets[i];
            const elemType = tt.types[i]!;

            if (Array.isArray(target)) {
              // Nested destructuring
              checkDestructuringMatch(target, elemType, `${path}[${i}]`);
            } else if (target.type) {
              // Check type compatibility
              if (!this.areTypesCompatible(target.type, elemType)) {
                throw new CompilerError(
                  `Type mismatch in tuple destructuring: variable '${target.name}' expects ${this.typeToString(target.type)}, got ${this.typeToString(elemType)}`,
                  "Ensure the tuple element types match the declared variable types.",
                  decl.location,
                );
              }
            }
          }
        };

        if (initType && initType.kind === "TupleType") {
          checkDestructuringMatch(decl.name, initType);
        } else if (initType) {
          throw new CompilerError(
            `Cannot destructure non-tuple type: ${this.typeToString(initType)}`,
            "Tuple destructuring requires a tuple value on the right-hand side.",
            decl.location,
          );
        }
      }
    } else {
      // Simple declaration
      if (decl.initializer) {
        const initType = this.checkExpression(decl.initializer);
        if (decl.typeAnnotation && initType) {
          let compatible = this.areTypesCompatible(
            decl.typeAnnotation,
            initType,
          );

          if (!compatible) {
            const val = this.getIntegerConstantValue(decl.initializer);
            if (val !== undefined) {
              compatible = this.isIntegerTypeCompatible(
                val,
                decl.typeAnnotation,
              );
            } else {
              compatible = this.isImplicitWideningAllowed(
                initType,
                decl.typeAnnotation,
              );
            }
          }

          if (!compatible) {
            // Try resolving types and checking again
            const resolvedDeclType = this.resolveType(decl.typeAnnotation);
            const resolvedInitType = this.resolveType(initType);
            compatible = this.areTypesCompatible(
              resolvedDeclType,
              resolvedInitType,
            );

            if (!compatible) {
              const val = this.getIntegerConstantValue(decl.initializer);
              if (val !== undefined) {
                compatible = this.isIntegerTypeCompatible(
                  val,
                  resolvedDeclType,
                );
              } else {
                compatible = this.isImplicitWideningAllowed(
                  resolvedInitType,
                  resolvedDeclType,
                );
              }
            }
          }

          if (!compatible) {
            const initTypeStr = this.typeToString(initType);
            const isNullLiteral =
              initType.kind === "BasicType" &&
              (initType.name === "nullptr" || initType.name === "null");

            const message = isNullLiteral
              ? `Cannot assign null/nullptr to non-pointer type ${this.typeToString(
                  decl.typeAnnotation,
                )}`
              : `Type mismatch in variable declaration: expected ${this.typeToString(
                  decl.typeAnnotation,
                )}, got ${initTypeStr}`;

            const hint = isNullLiteral
              ? `null/nullptr can only be assigned to pointer types, or used as a null object for struct types. Did you mean *${this.typeToString(
                  decl.typeAnnotation,
                )} if you intended a pointer?`
              : `Variable '${
                  decl.name as string
                }' cannot be assigned a value of incompatible type.`;

            throw new CompilerError(message, hint, decl.location);
          }
        }
      }
      this.defineSymbol(
        decl.name as string,
        "Variable",
        decl.typeAnnotation ? this.resolveType(decl.typeAnnotation) : undefined,
        decl,
      );
      decl.resolvedType = decl.typeAnnotation
        ? this.resolveType(decl.typeAnnotation)
        : undefined;
    }
  }

  private checkFunctionBody(
    decl: AST.FunctionDecl,
    parentStruct?: AST.StructDecl,
  ): void {
    // Symbol already defined in hoist pass

    const previousReturnType = this.currentFunctionReturnType;
    this.currentFunctionReturnType = decl.returnType;

    this.currentScope = this.currentScope.enterScope();

    if (parentStruct) {
      // Check for shadowing of generic parameters
      for (const gp of decl.genericParams) {
        if (parentStruct.genericParams.some((p) => p.name === gp.name)) {
          throw new CompilerError(
            `Shadowing of generic parameter '${gp.name}'`,
            `The generic parameter '${gp.name}' is already defined in the parent struct '${parentStruct.name}'. Please use a different name.`,
            decl.location,
          );
        }
      }

      // Define 'this'
      this.defineSymbol(
        "this",
        "Parameter",
        {
          kind: "BasicType",
          name: parentStruct.name,
          genericArgs: parentStruct.genericParams.map((p) => ({
            kind: "BasicType",
            name: p.name,
            genericArgs: [],
            pointerDepth: 0,
            arrayDimensions: [],
            location: decl.location,
          })), // Forward generics? Or just use the name?
          // If struct is generic Struct<T>, inside methods 'this' is Struct<T>*.
          // But T is a type parameter.
          // We need to ensure T is available in scope.
          pointerDepth: 1,
          arrayDimensions: [],
          location: decl.location,
        },
        decl,
      );
    }

    // Define generic parameters in scope
    for (const gp of decl.genericParams) {
      this.defineSymbol(
        gp.name,
        "TypeAlias",
        {
          kind: "BasicType",
          name: gp.name,
          genericArgs: [],
          pointerDepth: 0,
          arrayDimensions: [],
          location: decl.location,
        },
        {
          kind: "GenericParam",
          location: decl.location,
          ...gp,
        } as any,
      );
    }

    for (const param of decl.params) {
      const resolvedParamType = this.resolveType(param.type);
      this.defineSymbol(param.name, "Parameter", resolvedParamType, decl);
      // param is ASTNode? Let's check AST.ts
    }

    this.checkBlock(decl.body, false); // Don't create new scope, use function scope

    // Control Flow Analysis: Check if all paths return
    if (
      decl.returnType.kind === "BasicType" &&
      decl.returnType.name !== "void"
    ) {
      if (!this.checkAllPathsReturn(decl.body)) {
        throw new CompilerError(
          `Function '${decl.name}' might not return a value.`,
          "Ensure all code paths return a value matching the return type.",
          decl.location,
        );
      }
    }

    this.currentScope = this.currentScope.exitScope();
    this.currentFunctionReturnType = previousReturnType;
  }

  private checkStructBody(decl: AST.StructDecl): void {
    // Symbol already defined in hoist pass

    let parentStructCount = 0;
    if (decl.inheritanceList) {
      for (const typeNode of decl.inheritanceList) {
        if (typeNode.kind === "BasicType") {
          const symbol = this.currentScope.resolve(typeNode.name);
          if (!symbol) {
            throw new CompilerError(
              `Undefined type '${typeNode.name}' in inheritance list`,
              "Ensure the type is defined before inheritance.",
              typeNode.location,
            );
          }
          if (symbol.kind === "Struct") {
            parentStructCount++;
            if (parentStructCount > 1) {
              throw new CompilerError(
                `Multiple inheritance is not supported`,
                "A struct can only inherit from one parent struct.",
                typeNode.location,
              );
            }
          } else if (symbol.kind === "Spec") {
            this.checkSpecImplementation(
              decl,
              symbol.declaration as AST.SpecDecl,
              typeNode,
            );
          } else {
            throw new CompilerError(
              `Type '${typeNode.name}' is not a struct or spec`,
              "Only structs and specs can be inherited/implemented.",
              typeNode.location,
            );
          }
        }
      }
    }

    this.currentScope = this.currentScope.enterScope();
    // Add members to scope? Or Structs have their own scope resolution?
    // Usually structs define a type, and members are accessed via dot notation.
    // They don't pollute the local scope.
    // But methods inside might need to see other members?
    // For now, let's just check members.
    for (const member of decl.members) {
      if (member.kind === "FunctionDecl") {
        // Set resolvedType for struct methods so CodeGenerator can use it
        const functionType: AST.FunctionTypeNode = {
          kind: "FunctionType",
          returnType: this.resolveType(member.returnType),
          paramTypes: member.params.map((p) => this.resolveType(p.type)),
          location: member.location,
          declaration: member,
        };
        member.resolvedType = functionType;

        this.checkFunctionBody(member, decl); // Check method bodies
      } else {
        // Field
        // Check type validity
        const field = member as AST.StructField;
        field.resolvedType = this.resolveType(field.type);
      }
    }
    this.currentScope = this.currentScope.exitScope();
  }

  private checkSpecBody(decl: AST.SpecDecl): void {
    if (decl.extends) {
      for (const typeNode of decl.extends) {
        if (typeNode.kind === "BasicType") {
          const symbol = this.currentScope.resolve(typeNode.name);
          if (!symbol) {
            throw new CompilerError(
              `Undefined spec '${typeNode.name}' in inheritance list`,
              "Ensure the spec is defined before inheritance.",
              typeNode.location,
            );
          }
          if (symbol.kind !== "Spec") {
            throw new CompilerError(
              `Type '${typeNode.name}' is not a spec`,
              "Specs can only extend other specs.",
              typeNode.location,
            );
          }
        }
      }
    }
  }

  private checkSpecImplementation(
    structDecl: AST.StructDecl,
    specDecl: AST.SpecDecl,
    specTypeNode: AST.BasicTypeNode,
  ): void {
    const genericMapping = new Map<string, AST.TypeNode>();
    if (specDecl.genericParams.length > 0) {
      if (specTypeNode.genericArgs.length !== specDecl.genericParams.length) {
        throw new CompilerError(
          `Generic argument count mismatch for spec '${specDecl.name}'`,
          `Expected ${specDecl.genericParams.length}, got ${specTypeNode.genericArgs.length}`,
          specTypeNode.location,
        );
      }
      for (let i = 0; i < specDecl.genericParams.length; i++) {
        genericMapping.set(
          specDecl.genericParams[i]!.name,
          specTypeNode.genericArgs[i]!,
        );
      }
    }

    const structType: AST.BasicTypeNode = {
      kind: "BasicType",
      name: structDecl.name,
      genericArgs: structDecl.genericParams.map((p) => ({
        kind: "BasicType",
        name: p.name,
        genericArgs: [],
        pointerDepth: 0,
        arrayDimensions: [],
        location: structDecl.location,
      })),
      pointerDepth: 0,
      arrayDimensions: [],
      location: structDecl.location,
    };

    genericMapping.set("Self", structType);

    for (const method of specDecl.methods) {
      const impl = this.resolveStructMember(structDecl, method.name);
      if (!impl || impl.kind !== "FunctionDecl") {
        throw new CompilerError(
          `Struct '${structDecl.name}' does not implement method '${method.name}' from spec '${specDecl.name}'`,
          `Missing implementation for: ${this.formatSpecMethod(method)}`,
          structDecl.location,
        );
      }

      if (method.params.length !== impl.params.length) {
        throw new CompilerError(
          `Method '${method.name}' implementation has wrong number of parameters`,
          `Expected ${method.params.length}, got ${impl.params.length}`,
          impl.location,
        );
      }

      for (let i = 0; i < method.params.length; i++) {
        const specParamType = method.params[i]!.type;
        const implParamType = impl.params[i]!.type;

        const expectedType = this.substituteType(specParamType, genericMapping);
        const actualType = this.resolveType(implParamType);

        if (!this.areTypesCompatible(expectedType, actualType)) {
          throw new CompilerError(
            `Method '${method.name}' parameter '${method.params[i]!.name}' type mismatch`,
            `Expected '${this.typeToString(expectedType)}', got '${this.typeToString(actualType)}'`,
            impl.params[i]!.type.location,
          );
        }
      }

      const specRet = method.returnType || {
        kind: "BasicType",
        name: "void",
        genericArgs: [],
        pointerDepth: 0,
        arrayDimensions: [],
        location: method.location,
      };
      const implRet = impl.returnType;

      const expectedRet = this.substituteType(specRet, genericMapping);
      const actualRet = this.resolveType(implRet);

      if (!this.areTypesCompatible(expectedRet, actualRet)) {
        throw new CompilerError(
          `Method '${method.name}' return type mismatch`,
          `Expected '${this.typeToString(expectedRet)}', got '${this.typeToString(actualRet)}'`,
          impl.returnType.location,
        );
      }
    }
  }

  private formatSpecMethod(method: AST.SpecMethod): string {
    const params = method.params
      .map((p) => `${p.name}: ${this.typeToString(p.type)}`)
      .join(", ");
    const ret = method.returnType
      ? ` ret ${this.typeToString(method.returnType)}`
      : "";
    return `frame ${method.name}(${params})${ret}`;
  }

  private checkTypeAlias(decl: AST.TypeAliasDecl): void {
    this.defineSymbol(decl.name, "TypeAlias", decl.type, decl);
  }

  private defineImportedSymbol(
    name: string,
    symbol: Symbol,
    scope?: SymbolTable,
  ): void {
    // Define primary symbol
    if (scope) {
      scope.define({
        name,
        kind: symbol.kind,
        type: symbol.type,
        declaration: symbol.declaration,
        moduleScope: symbol.moduleScope,
      });
    } else {
      this.defineSymbol(
        name,
        symbol.kind,
        symbol.type,
        symbol.declaration,
        symbol.moduleScope,
      );
    }

    // Define overloads
    if (symbol.overloads) {
      for (const overload of symbol.overloads) {
        if (scope) {
          scope.define({
            name,
            kind: overload.kind,
            type: overload.type,
            declaration: overload.declaration,
            moduleScope: overload.moduleScope,
          });
        } else {
          this.defineSymbol(
            name,
            overload.kind,
            overload.type,
            overload.declaration,
            overload.moduleScope,
          );
        }
      }
    }
  }

  private checkImport(stmt: AST.ImportStmt): void {
    const currentFile = stmt.location.file;

    // Try to resolve the import path
    let importPath: string | undefined;
    let ast: AST.Program | undefined;

    // Check if we have a pre-loaded module that matches
    // This happens when using ModuleResolver
    if (this.skipImportResolution) {
      // Try to resolve the import path to match against pre-loaded modules
      let resolvedImportPath: string | undefined;

      if (stmt.source.startsWith("std/")) {
        const stdLibPath = path.join(__dirname, "../../lib");
        resolvedImportPath = path.join(stdLibPath, stmt.source.substring(4));
      } else if (path.isAbsolute(stmt.source)) {
        resolvedImportPath = stmt.source;
      } else {
        const currentDir = path.dirname(currentFile);
        resolvedImportPath = path.resolve(currentDir, stmt.source);
      }

      // Try to find exact match first (checking extensions)
      if (resolvedImportPath) {
        if (this.preLoadedModules.has(resolvedImportPath)) {
          importPath = resolvedImportPath;
          ast = this.preLoadedModules.get(importPath);
        } else {
          // Try extensions
          for (const ext of [".x", ".bpl"]) {
            const withExt = resolvedImportPath + ext;
            if (this.preLoadedModules.has(withExt)) {
              importPath = withExt;
              ast = this.preLoadedModules.get(importPath);
              break;
            }
          }
        }
      }

      if (!importPath) {
        // Fallback to heuristic
        for (const [modulePath, moduleAst] of this.preLoadedModules) {
          // Simple heuristic: if the module path contains the import source
          if (
            modulePath.includes(stmt.source) ||
            modulePath.includes(stmt.source.replace(/^[./]+/, ""))
          ) {
            importPath = modulePath;
            ast = moduleAst;
            break;
          }
        }
      }

      if (!importPath) {
        // This shouldn't happen if ModuleResolver did its job
        throw new CompilerError(
          `Module not found: ${stmt.source}`,
          "Module resolution failed",
          stmt.location,
        );
      }
    } else {
      // Handle std/ prefix
      if (stmt.source.startsWith("std/")) {
        const stdLibPath = path.join(__dirname, "../../lib");
        const relativePath = stmt.source.substring(4);
        importPath = path.join(stdLibPath, relativePath);
      } else {
        const currentDir = path.dirname(currentFile);
        importPath = path.resolve(currentDir, stmt.source);
      }
    }

    // Check if already loaded
    let moduleScope = this.modules.get(importPath);

    if (!moduleScope) {
      // Load module if not already available
      if (!ast) {
        if (!fs.existsSync(importPath)) {
          throw new CompilerError(
            `Module not found: ${importPath}`,
            "Ensure the file exists and the path is correct.",
            stmt.location,
          );
        }

        const content = fs.readFileSync(importPath, "utf-8");
        const tokens = lexWithGrammar(content, importPath);
        const parser = new Parser(content, importPath, tokens);
        ast = parser.parse();
      }

      moduleScope = new SymbolTable();
      this.modules.set(importPath, moduleScope);
      this.initializeBuiltinsInScope(moduleScope);

      // Context switch
      const prevGlobal = this.globalScope;
      const prevCurrent = this.currentScope;

      this.globalScope = moduleScope;
      this.currentScope = moduleScope;

      // Hoist declarations in the imported module
      for (const s of ast.statements) {
        this.hoistDeclaration(s);
      }

      // Restore context
      this.globalScope = prevGlobal;
      this.currentScope = prevCurrent;
    }

    // Import items
    if (stmt.namespace) {
      // Import as namespace
      // We need to create a restricted scope that only contains exported items
      const exportedScope = new SymbolTable(undefined); // No parent, isolated

      if (ast) {
        for (const s of ast.statements) {
          if (s.kind === "Export") {
            const exportStmt = s as AST.ExportStmt;
            const symbol = moduleScope.resolve(exportStmt.item);
            if (symbol) {
              this.defineImportedSymbol(symbol.name, symbol, exportedScope);
            }
          }
        }
      } else if (this.skipImportResolution) {
        // Try to find AST from preLoadedModules
        let moduleAst: AST.Program | undefined;
        for (const [modulePath, mAst] of this.preLoadedModules) {
          if (modulePath === importPath) {
            moduleAst = mAst;
            break;
          }
        }

        if (moduleAst) {
          for (const s of moduleAst.statements) {
            if (s.kind === "Export") {
              const exportStmt = s as AST.ExportStmt;
              const symbol = moduleScope.resolve(exportStmt.item);
              if (symbol) {
                exportedScope.define({
                  name: symbol.name,
                  kind: symbol.kind,
                  type: symbol.type,
                  declaration: symbol.declaration,
                  moduleScope: symbol.moduleScope,
                });
              }
            }
          }
        }
      }

      this.defineSymbol(
        stmt.namespace,
        "Module",
        undefined,
        stmt,
        exportedScope,
      );
    } else if (stmt.importAll) {
      // Import all exported symbols
      // We need to know which symbols are exported.
      // Currently SymbolTable doesn't track exports explicitly, but we can iterate over all symbols?
      // Or we should track exports in ModuleInfo/AST.
      // AST has ExportStmt.

      // Let's iterate over AST statements to find exports
      if (ast) {
        for (const s of ast.statements) {
          if (s.kind === "Export") {
            const exportStmt = s as AST.ExportStmt;
            const symbol = moduleScope.resolve(exportStmt.item);
            if (symbol) {
              this.defineImportedSymbol(symbol.name, symbol);
            }
          }
        }
      } else {
        // If AST is not available (pre-loaded but not passed here?), we might have a problem.
        // But we set 'ast' above.
        // Wait, if moduleScope was already loaded, 'ast' might be undefined here if we didn't reload it.
        // We need to store AST in modules map or re-fetch it.
        // Actually, we can just iterate moduleScope symbols? But that includes non-exported ones.
        // We need to know what is exported.

        // For now, let's assume we can get AST.
        // If moduleScope exists, we didn't parse AST.
        // We should store exports in ModuleInfo or similar.
        // AST has ExportStmt.

        // Let's try to find AST from preLoadedModules if available
        if (!ast && this.skipImportResolution) {
          for (const [modulePath, moduleAst] of this.preLoadedModules) {
            if (modulePath === importPath) {
              ast = moduleAst;
              break;
            }
          }
        }

        if (ast) {
          for (const s of ast.statements) {
            if (s.kind === "Export") {
              const exportStmt = s as AST.ExportStmt;
              const symbol = moduleScope.resolve(exportStmt.item);
              if (symbol) {
                this.defineImportedSymbol(symbol.name, symbol);
              }
            }
          }
        }
      }
    }

    for (const item of stmt.items) {
      // Check if the item is exported by looking at ExportStmt nodes in AST
      let isExported = false;
      let exportedSymbol: any = null;

      if (ast) {
        for (const s of ast.statements) {
          if (s.kind === "Export") {
            const exportStmt = s as AST.ExportStmt;
            if (exportStmt.item === item.name) {
              isExported = true;
              exportedSymbol = moduleScope.resolve(item.name);
              break;
            }
          }
        }
      }

      if (!isExported || !exportedSymbol) {
        throw new CompilerError(
          `Module '${stmt.source}' does not export '${item.name}'`,
          "Ensure the symbol is exported (or defined) in the module.",
          stmt.location,
        );
      }

      const symbol = exportedSymbol;

      // Define in current scope
      this.defineImportedSymbol(item.alias || item.name, symbol);
    }
  }

  private checkExtern(decl: AST.ExternDecl): void {
    this.defineSymbol(decl.name, "Function", undefined, decl);
  }

  private checkBlock(stmt: AST.BlockStmt, newScope: boolean = true): void {
    if (newScope) this.currentScope = this.currentScope.enterScope();
    for (const s of stmt.statements) {
      try {
        this.checkStatement(s);
      } catch (e) {
        if (this.collectAllErrors && e instanceof CompilerError) {
          this.errors.push(e);
          // Continue with next statement in block
          continue;
        }
        throw e;
      }
    }
    if (newScope) this.currentScope = this.currentScope.exitScope();
  }

  private checkIf(stmt: AST.IfStmt): void {
    this.checkExpression(stmt.condition);
    this.checkBlock(stmt.thenBranch);
    if (stmt.elseBranch) {
      if (stmt.elseBranch.kind === "Block") {
        this.checkBlock(stmt.elseBranch);
      } else if (stmt.elseBranch.kind === "If") {
        this.checkIf(stmt.elseBranch);
      }
    }
  }

  private checkLoop(stmt: AST.LoopStmt): void {
    if (stmt.condition) this.checkExpression(stmt.condition);
    this.loopDepth++;
    this.checkBlock(stmt.body);
    this.loopDepth--;
  }

  private checkReturn(stmt: AST.ReturnStmt): void {
    if (stmt.value) {
      const returnType = this.checkExpression(stmt.value);
      if (this.currentFunctionReturnType && returnType) {
        if (
          !this.areTypesCompatible(this.currentFunctionReturnType, returnType)
        ) {
          throw new CompilerError(
            `Return type mismatch: expected ${this.typeToString(
              this.currentFunctionReturnType,
            )}, got ${this.typeToString(returnType)}`,
            "The return value does not match the function's declared return type.",
            stmt.location,
          );
        }
      }
    } else {
      // No value returned
      if (
        this.currentFunctionReturnType &&
        this.currentFunctionReturnType.kind === "BasicType" &&
        this.currentFunctionReturnType.name !== "void"
      ) {
        throw new CompilerError(
          `Missing return value: expected ${this.typeToString(
            this.currentFunctionReturnType,
          )}`,
          "Functions with non-void return types must return a value.",
          stmt.location,
        );
      }
    }
  }

  private checkTry(stmt: AST.TryStmt): void {
    this.checkBlock(stmt.tryBlock);
    for (const clause of stmt.catchClauses) {
      this.currentScope = this.currentScope.enterScope();
      this.defineSymbol(clause.variable, "Variable", clause.type, clause);
      this.checkBlock(clause.body, false);
      this.currentScope = this.currentScope.exitScope();
    }
    if (stmt.catchOther) this.checkBlock(stmt.catchOther);
  }

  private checkThrow(stmt: AST.ThrowStmt): void {
    this.checkExpression(stmt.expression);
  }

  private checkSwitch(stmt: AST.SwitchStmt): void {
    this.checkExpression(stmt.expression);
    this.loopDepth++; // Break is valid in switch
    for (const c of stmt.cases) {
      this.checkExpression(c.value);
      this.checkBlock(c.body);
    }
    if (stmt.defaultCase) this.checkBlock(stmt.defaultCase);
    this.loopDepth--;
  }

  // --- Expressions ---

  private checkExpression(expr: AST.Expression): AST.TypeNode | undefined {
    let type: AST.TypeNode | undefined;
    switch (expr.kind) {
      case "Literal":
        type = this.checkLiteral(expr);
        break;
      case "Identifier":
        type = this.checkIdentifier(expr);
        break;
      case "Binary":
        type = this.checkBinary(expr);
        break;
      case "Unary":
        type = this.checkUnary(expr);
        break;
      case "Assignment":
        type = this.checkAssignment(expr);
        break;
      case "Call":
        type = this.checkCall(expr);
        break;
      case "Member":
        type = this.checkMember(expr);
        break;
      case "Index":
        type = this.checkIndex(expr);
        break;
      case "Ternary":
        type = this.checkTernary(expr);
        break;
      case "Cast":
        type = this.checkCast(expr);
        break;
      case "Sizeof":
        type = this.checkSizeof(expr);
        break;
      case "Match":
        type = this.checkMatch(expr);
        break;
      case "ArrayLiteral":
        type = this.checkArrayLiteral(expr);
        break;
      case "StructLiteral":
        type = this.checkStructLiteral(expr);
        break;
      case "TupleLiteral":
        type = this.checkTupleLiteral(expr);
        break;
      case "GenericInstantiation":
        type = this.checkGenericInstantiation(expr);
        break;
    }
    if (type) {
      expr.resolvedType = this.resolveType(type);
    }
    return type;
  }

  private checkLiteral(expr: AST.LiteralExpr): AST.TypeNode {
    let name = "void";
    if (expr.type === "number") {
      // Check if it's a float or int
      if (
        expr.raw.includes(".") ||
        expr.raw.includes("e") ||
        expr.raw.includes("E")
      ) {
        name = "float";
      } else {
        // Default to int (i32), promote to long (i64) if too big
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
      name = "nullptr"; // Special pointer-null literal
    } else if (expr.type === "null") {
      name = "null"; // Special object-null literal
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

  private checkIdentifier(expr: AST.IdentifierExpr): AST.TypeNode | undefined {
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
    return symbol.type;
  }

  private isIntegerType(type: AST.TypeNode): boolean {
    if (type.kind !== "BasicType") return false;
    if (type.pointerDepth > 0) return false;
    const integerTypes = [
      "i8",
      "u8",
      "i16",
      "u16",
      "i32",
      "u32",
      "i64",
      "u64",
      "int",
      "uint",
      "long",
      "ulong",
      "short",
      "ushort",
      "char",
      "uchar",
    ];
    return integerTypes.includes(type.name);
  }

  private isComparisonOperator(op: TokenType): boolean {
    return [
      TokenType.EqualEqual,
      TokenType.BangEqual,
      TokenType.Less,
      TokenType.LessEqual,
      TokenType.Greater,
      TokenType.GreaterEqual,
    ].includes(op);
  }

  private checkBinary(expr: AST.BinaryExpr): AST.TypeNode | undefined {
    const leftType = this.checkExpression(expr.left);
    const rightType = this.checkExpression(expr.right);

    if (!leftType || !rightType) return undefined;

    const op = expr.operator.type;

    // Pointer Arithmetic
    const isLeftPtr =
      leftType.kind === "BasicType" && leftType.pointerDepth > 0;
    const isRightPtr =
      rightType.kind === "BasicType" && rightType.pointerDepth > 0;

    if (isLeftPtr || isRightPtr) {
      if (op === TokenType.Plus || op === TokenType.Minus) {
        if (isLeftPtr && isRightPtr) {
          if (op === TokenType.Minus) {
            // ptr - ptr -> long
            if (!this.areTypesCompatible(leftType, rightType)) {
              throw new CompilerError(
                "Pointer subtraction requires compatible pointer types",
                "Ensure both pointers point to the same type.",
                expr.location,
              );
            }
            return {
              kind: "BasicType",
              name: "long",
              genericArgs: [],
              pointerDepth: 0,
              arrayDimensions: [],
              location: expr.location,
            };
          }
          throw new CompilerError(
            "Cannot add two pointers",
            "Pointer addition is not supported.",
            expr.location,
          );
        }
        if (isLeftPtr) {
          if (!this.isIntegerType(rightType)) {
            throw new CompilerError(
              `Pointer arithmetic requires integer operand, got ${this.typeToString(
                rightType,
              )}`,
              "Ensure the offset is an integer.",
              expr.right.location,
            );
          }
          return leftType;
        }
        if (isRightPtr) {
          if (op === TokenType.Minus)
            throw new CompilerError(
              "Cannot subtract pointer from integer",
              "Pointer must be on the left side of subtraction.",
              expr.location,
            );
          if (!this.isIntegerType(leftType)) {
            throw new CompilerError(
              `Pointer arithmetic requires integer operand, got ${this.typeToString(
                leftType,
              )}`,
              "Ensure the offset is an integer.",
              expr.left.location,
            );
          }
          return rightType;
        }
      }

      if (this.isComparisonOperator(op)) {
        if (!this.areTypesCompatible(leftType, rightType)) {
          // Allow nullptr comparison
          const isLeftNull =
            leftType.kind === "BasicType" && leftType.name === "nullptr";
          const isRightNull =
            rightType.kind === "BasicType" && rightType.name === "nullptr";
          if (!isLeftNull && !isRightNull) {
            throw new CompilerError(
              "Comparison between incompatible pointer types",
              "Ensure pointers are compatible.",
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

      throw new CompilerError(
        `Invalid operator '${expr.operator.lexeme}' for pointer type`,
        "Pointers only support addition, subtraction, and comparison.",
        expr.location,
      );
    }

    // Comparison operators
    if (this.isComparisonOperator(op)) {
      if (!this.areTypesCompatible(leftType, rightType)) {
        // Allow comparison between integer types
        if (this.isIntegerType(leftType) && this.isIntegerType(rightType)) {
          // Allowed
        } else {
          throw new CompilerError(
            `Comparison between incompatible types: ${this.typeToString(
              leftType,
            )} and ${this.typeToString(rightType)}`,
            "Ensure operands are compatible.",
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

    // Logical operators
    if (op === TokenType.AndAnd || op === TokenType.OrOr) {
      const isBool = (t: AST.TypeNode) =>
        t.kind === "BasicType" &&
        (t.name === "bool" || t.name === "i1") &&
        t.pointerDepth === 0;

      if (!isBool(leftType)) {
        throw new CompilerError(
          "Logical operator requires boolean operands",
          "Left operand must be boolean.",
          expr.left.location,
        );
      }
      if (!isBool(rightType)) {
        throw new CompilerError(
          "Logical operator requires boolean operands",
          "Right operand must be boolean.",
          expr.right.location,
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

    // Arithmetic operators
    if (!this.areTypesCompatible(leftType, rightType)) {
      // Allow arithmetic between integer types
      if (this.isIntegerType(leftType) && this.isIntegerType(rightType)) {
        const size1 = this.getIntegerSize(leftType);
        const size2 = this.getIntegerSize(rightType);
        return size1 >= size2 ? leftType : rightType;
      }

      throw new CompilerError(
        `Operator '${expr.operator.lexeme}' cannot be applied to types '${this.typeToString(
          leftType,
        )}' and '${this.typeToString(rightType)}'`,
        "Ensure operands are compatible.",
        expr.location,
      );
    }

    return leftType;
  }

  private checkUnary(expr: AST.UnaryExpr): AST.TypeNode | undefined {
    const operandType = this.checkExpression(expr.operand);
    if (!operandType) return undefined;

    if (expr.operator.type === TokenType.Star) {
      // Dereference
      if (operandType.kind === "BasicType") {
        if (operandType.pointerDepth > 0) {
          return {
            ...operandType,
            pointerDepth: operandType.pointerDepth - 1,
          };
        } else {
          throw new CompilerError(
            `Cannot dereference non-pointer type ${this.typeToString(
              operandType,
            )}`,
            "Ensure the operand is a pointer.",
            expr.location,
          );
        }
      }
    } else if (expr.operator.type === TokenType.Ampersand) {
      // Address of
      if (operandType.kind === "BasicType") {
        return {
          ...operandType,
          pointerDepth: operandType.pointerDepth + 1,
        };
      }
    }

    return operandType;
  }

  private checkAssignment(expr: AST.AssignmentExpr): AST.TypeNode | undefined {
    const targetType = this.checkExpression(expr.assignee);
    const valueType = this.checkExpression(expr.value);

    if (targetType && valueType) {
      let compatible = this.areTypesCompatible(targetType, valueType);
      if (!compatible) {
        const val = this.getIntegerConstantValue(expr.value);
        if (val !== undefined) {
          compatible = this.isIntegerTypeCompatible(val, targetType);
        }
      }

      if (!compatible) {
        throw new CompilerError(
          `Type mismatch in assignment: cannot assign ${this.typeToString(
            valueType,
          )} to ${this.typeToString(targetType)}`,
          "The assigned value is not compatible with the target variable's type.",
          expr.location,
        );
      }
    }
    return targetType;
  }

  private areSignaturesEqual(
    a: AST.FunctionTypeNode,
    b: AST.FunctionTypeNode,
  ): boolean {
    if (a.paramTypes.length !== b.paramTypes.length) return false;
    for (let i = 0; i < a.paramTypes.length; i++) {
      if (
        this.typeToString(a.paramTypes[i]!) !==
        this.typeToString(b.paramTypes[i]!)
      )
        return false;
    }
    return true;
  }

  private resolveOverload(
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
        `No matching function for call to '${name}' with ${argTypes.length} arguments${genericArgs.length > 0 ? ` and ${genericArgs.length} generic arguments` : ""}.`,
        `Available overloads:\n${candidates
          .map((c) => this.typeToString(c.type!))
          .join("\n")}`,
        location,
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
        const sub = this.substituteType(c.type!, map) as AST.FunctionTypeNode;
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

        const exactMatch = this.areTypesExactMatch(
          ft.paramTypes[i]!,
          argTypes[i]!,
        );
        if (exactMatch) {
          continue;
        }

        isExact = false;

        const widening = this.isImplicitWideningAllowed(
          argTypes[i]!,
          ft.paramTypes[i]!,
        );
        if (widening) {
          needsWidening = true;
          continue;
        }

        const compatible = this.areTypesCompatible(
          ft.paramTypes[i]!,
          argTypes[i]!,
        );
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
        `Available overloads:\n${candidates
          .map((c) => this.typeToString(c.type!))
          .join("\n")}`,
        location,
      );
    }

    return matched[0]!;
  }

  private checkCall(expr: AST.CallExpr): AST.TypeNode | undefined {
    if (expr.callee.kind === "Identifier") {
      const name = (expr.callee as AST.IdentifierExpr).name;
      const symbol = this.currentScope.resolve(name);

      if (symbol && symbol.kind === "Function") {
        const candidates = [symbol, ...(symbol.overloads || [])];
        const argTypes = expr.args.map((arg) => this.checkExpression(arg));

        const match = this.resolveOverload(
          name,
          candidates,
          argTypes,
          expr.genericArgs || [],
          expr.location,
        );

        expr.resolvedDeclaration = match.declaration as
          | AST.FunctionDecl
          | AST.ExternDecl;
        expr.callee.resolvedType = match.type;

        if (match.genericArgs) {
          expr.genericArgs = match.genericArgs;
        }

        return (match.type as AST.FunctionTypeNode).returnType;
      }
    }

    const calleeType = this.checkExpression(expr.callee);

    // Always check arguments to ensure they are valid expressions and resolve their types
    const argTypes = expr.args.map((arg) => this.checkExpression(arg));

    if (calleeType && (calleeType as any).overloads) {
      const overloads = (calleeType as any).overloads as AST.FunctionTypeNode[];
      const candidates: Symbol[] = overloads.map((ft) => ({
        name:
          expr.callee.kind === "Member"
            ? (expr.callee as AST.MemberExpr).property
            : "function",
        kind: "Function",
        type: ft,
        declaration: (ft as any).declaration,
      }));

      const name =
        expr.callee.kind === "Member"
          ? (expr.callee as AST.MemberExpr).property
          : "function";

      const match = this.resolveOverload(
        name,
        candidates,
        argTypes,
        expr.genericArgs || [],
        expr.location,
      );

      expr.resolvedDeclaration = match.declaration as
        | AST.FunctionDecl
        | AST.ExternDecl;
      expr.callee.resolvedType = match.type;

      return (match.type as AST.FunctionTypeNode).returnType;
    }

    if (calleeType && calleeType.kind === "FunctionType") {
      // Check if it's variadic (hacky check: if params empty but args exist, or if we marked it)
      // We don't have isVariadic on FunctionType.
      // But we can check the declaration if available.
      const decl = (calleeType as any).declaration; // Could be FunctionDecl or undefined (Extern)

      // If we want to support variadic, we need to know.
      // For now, let's just check count if we have params.

      // If it's printf (extern), we might have 0 params in type but args provided.
      // If paramTypes is empty, maybe it's variadic or just no params.

      // Let's assume strict check unless we know it's variadic.
      // But I set params to [] for variadic externs.

      if (calleeType.paramTypes.length !== expr.args.length) {
        // If it's an extern with empty params, maybe it's variadic?
        // But normal functions can have empty params.
        // I need to store isVariadic in FunctionType.
      }

      for (
        let i = 0;
        i < Math.min(calleeType.paramTypes.length, expr.args.length);
        i++
      ) {
        const argType = argTypes[i];
        const paramType = calleeType.paramTypes[i];
        if (
          argType &&
          paramType &&
          !this.areTypesCompatible(paramType, argType)
        ) {
          throw new CompilerError(
            `Function argument type mismatch at position ${
              i + 1
            }: expected ${this.typeToString(
              paramType,
            )}, got ${this.typeToString(argType)}`,
            "The argument type does not match the parameter type.",
            expr.args[i]!.location,
          );
        }
      }
      return calleeType.returnType;
    }
    return undefined;
  }

  private checkMember(expr: AST.MemberExpr): AST.TypeNode | undefined {
    // Disallow direct null object member access
    if (
      expr.object.kind === "Literal" &&
      (expr.object as AST.LiteralExpr).type === "null"
    ) {
      throw new CompilerError(
        "Null object dereference",
        "You are accessing a member on a null object. Initialize the struct or check 'x == null' before use.",
        expr.object.location,
      );
    }
    let objectType = this.checkExpression(expr.object);

    if (objectType && (objectType as any).kind === "ModuleType") {
      const moduleScope = (objectType as any).moduleScope as SymbolTable;
      const symbol = moduleScope.resolve(expr.property);
      if (!symbol) {
        throw new CompilerError(
          `Module '${(objectType as any).name}' has no exported member '${
            expr.property
          }'`,
          "Check the module exports.",
          expr.location,
        );
      }

      // If it's a struct, return MetaType
      if (symbol.kind === "Struct") {
        return {
          kind: "MetaType",
          type: {
            kind: "BasicType",
            name: symbol.name,
            genericArgs: [],
            pointerDepth: 0,
            arrayDimensions: [],
            location: expr.location,
          },
          location: expr.location,
        } as any;
      }

      // If it's a function, return FunctionType
      if (symbol.kind === "Function") {
        // We need to return the function type, but also attach the declaration so CodeGen can find it?
        // CodeGen uses resolvedType.
        return symbol.type;
      }

      return symbol.type;
    }

    if (objectType && objectType.kind === "MetaType") {
      const inner = (objectType as any).type;
      if (inner.kind === "BasicType") {
        const symbol = this.currentScope.resolve(inner.name);
        if (symbol && symbol.kind === "Struct") {
          const decl = symbol.declaration as AST.StructDecl;
          const members = decl.members.filter((m) => m.name === expr.property);
          if (members.length > 0) {
            const candidates: AST.FunctionTypeNode[] = [];
            for (const m of members) {
              if (m.kind === "FunctionDecl") {
                const member = m as AST.FunctionDecl;
                let memberType: AST.FunctionTypeNode = {
                  kind: "FunctionType",
                  returnType: member.returnType,
                  paramTypes: member.params.map((p) => p.type),
                  location: member.location,
                  declaration: member,
                };

                // Substitute struct generics
                if (
                  decl.genericParams.length > 0 &&
                  inner.genericArgs.length === decl.genericParams.length
                ) {
                  const mapping = new Map<string, AST.TypeNode>();
                  for (let i = 0; i < decl.genericParams.length; i++) {
                    mapping.set(
                      decl.genericParams[i]!.name,
                      inner.genericArgs[i]!,
                    );
                  }
                  memberType = this.substituteType(
                    memberType,
                    mapping,
                  ) as AST.FunctionTypeNode;
                  (memberType as any).declaration = member;
                }
                candidates.push(memberType);
              }
            }

            if (candidates.length > 0) {
              const first = candidates[0]!;
              (first as any).overloads = candidates;
              return first;
            }
          }
        }
      }
    }

    if (objectType && objectType.kind === "BasicType") {
      // Handle pointer to struct (implicit dereference)
      // If pointerDepth > 0, we assume it's a pointer to the struct.
      // We don't need to change anything here because we resolve by name.
      // But we should ensure it IS a struct or pointer to struct.

      // Handle namespaced types: mod.Person
      let symbol = this.currentScope.resolve(objectType.name);
      if (!symbol && objectType.name.includes(".")) {
        // Try to resolve as namespaced type
        const parts = objectType.name.split(".");
        const namespaceName = parts[0];
        const typeName = parts.slice(1).join(".");

        const namespaceSymbol = this.currentScope.resolve(namespaceName!);
        if (
          namespaceSymbol &&
          namespaceSymbol.kind === "Module" &&
          namespaceSymbol.moduleScope
        ) {
          symbol = namespaceSymbol.moduleScope.resolve(typeName);
        }
      }
      let structDecl: AST.StructDecl | undefined;

      // Handle Generic Params with Constraints
      if (
        symbol &&
        symbol.kind === "TypeAlias" &&
        (symbol.declaration as any).kind === "GenericParam"
      ) {
        const gp = symbol.declaration as any;
        if (gp.constraint && gp.constraint.kind === "BasicType") {
          const constraintType = this.resolveType(
            gp.constraint,
          ) as AST.BasicTypeNode;
          objectType = constraintType;
          symbol = this.currentScope.resolve(objectType.name);
        }
      }

      if (objectType.resolvedDeclaration) {
        structDecl = objectType.resolvedDeclaration;
      } else if (
        symbol &&
        symbol.kind === "Struct" &&
        (symbol.declaration as any).kind === "StructDecl"
      ) {
        structDecl = symbol.declaration as AST.StructDecl;
      }

      if (structDecl) {
        // Use resolveMemberWithContext to handling inheritance substitution
        const result = this.resolveMemberWithContext(objectType, expr.property);

        if (result) {
          const { members, contextType, contextDecl } = result;

          // Create substitution mapping from context
          const mapping = new Map<string, AST.TypeNode>();
          if (
            contextDecl.genericParams.length > 0 &&
            contextType.genericArgs.length === contextDecl.genericParams.length
          ) {
            for (let i = 0; i < contextDecl.genericParams.length; i++) {
              mapping.set(
                contextDecl.genericParams[i]!.name,
                contextType.genericArgs[i]!,
              );
            }
          }

          const field = members.find((m) => m.kind === "StructField");
          if (field) {
            const member = field as AST.StructField;
            // Substitute struct generics for field type
            let fieldType = member.type;
            if (mapping.size > 0) {
              fieldType = this.substituteType(fieldType, mapping);
            }
            return fieldType;
          }

          const functions = members.filter(
            (m) => m.kind === "FunctionDecl",
          ) as AST.FunctionDecl[];

          if (functions.length > 0) {
            const candidates: AST.FunctionTypeNode[] = [];

            for (const member of functions) {
              if (member.isStatic) continue;

              let paramTypes = member.params.map((p) => p.type);
              let compatible = true;

              if (
                member.params.length > 0 &&
                member.params[0]!.name === "this"
              ) {
                let thisParamType = member.params[0]!.type;

                if (mapping.size > 0) {
                  thisParamType = this.substituteType(thisParamType, mapping);
                }

                let isThisCompatible = this.areTypesCompatible(
                  thisParamType,
                  objectType,
                );
                const thisParamRef = thisParamType;

                if (
                  !isThisCompatible &&
                  thisParamRef.kind === "BasicType" &&
                  objectType.kind === "BasicType" &&
                  thisParamRef.name === objectType.name &&
                  thisParamRef.pointerDepth === objectType.pointerDepth + 1
                )
                  isThisCompatible = true;
                if (
                  !isThisCompatible &&
                  thisParamRef.kind === "BasicType" &&
                  objectType.kind === "BasicType" &&
                  thisParamRef.name === objectType.name &&
                  objectType.pointerDepth === thisParamRef.pointerDepth + 1
                )
                  isThisCompatible = true;
                if (!isThisCompatible) {
                  const objPtr = {
                    ...objectType,
                    pointerDepth: objectType.pointerDepth + 1,
                  };
                  if (this.areTypesCompatible(thisParamRef, objPtr))
                    isThisCompatible = true;
                }
                if (!isThisCompatible && objectType.pointerDepth > 0) {
                  const objDeref = {
                    ...objectType,
                    pointerDepth: objectType.pointerDepth - 1,
                  };
                  if (this.areTypesCompatible(thisParamRef, objDeref))
                    isThisCompatible = true;
                }

                if (!isThisCompatible) {
                  compatible = false;
                } else {
                  paramTypes = paramTypes.slice(1);
                }
              }

              if (compatible) {
                let returnType = member.returnType;
                if (mapping.size > 0) {
                  returnType = this.substituteType(returnType, mapping);
                  paramTypes = paramTypes.map((p) =>
                    this.substituteType(p, mapping),
                  );
                }

                const funcType: AST.FunctionTypeNode = {
                  kind: "FunctionType",
                  returnType,
                  paramTypes,
                  location: member.location,
                };
                (funcType as any).declaration = member;
                candidates.push(funcType);
              }
            }

            if (candidates.length === 0) {
              throw new CompilerError(
                `No matching overload for method '${expr.property}' on type '${objectType.name}'`,
                "Check 'this' parameter compatibility or static/instance mismatch.",
                expr.location,
              );
            }

            const resultType = candidates[0]!;
            (resultType as any).overloads = candidates;
            return resultType;
          }
        } else {
          throw new CompilerError(
            `Struct '${objectType.name}' has no member '${expr.property}'`,
            "Check the struct definition.",
            expr.location,
          );
        }
      } else {
        throw new CompilerError(
          `Could not resolve struct declaration for type '${objectType.name}'`,
          "Ensure the struct is defined and visible.",
          expr.location,
        );
      }
    }
    return undefined;
  }

  private checkIndex(expr: AST.IndexExpr): AST.TypeNode | undefined {
    // Disallow direct null object indexing access
    if (
      expr.object.kind === "Literal" &&
      (expr.object as AST.LiteralExpr).type === "null"
    ) {
      throw new CompilerError(
        "Null object dereference",
        "You are indexing into a null object. Initialize the value or check 'x == null' before use.",
        expr.object.location,
      );
    }
    const objectType = this.checkExpression(expr.object);
    const indexType = this.checkExpression(expr.index);

    const integerTypes = [
      "i8",
      "u8",
      "i16",
      "u16",
      "i32",
      "u32",
      "i64",
      "u64",
      "int",
      "uint",
      "long",
      "ulong",
      "short",
      "ushort",
      "char",
      "uchar",
    ];

    if (
      !indexType ||
      (indexType.kind === "BasicType" && !integerTypes.includes(indexType.name))
    ) {
      throw new CompilerError(
        `Array index must be an integer, got ${this.typeToString(indexType)}`,
        "Ensure the index expression evaluates to an integer.",
        expr.index.location,
      );
    }

    if (objectType && objectType.kind === "BasicType") {
      // Check if it's an array or pointer
      if (objectType.arrayDimensions.length > 0) {
        // It's an array, peel off one dimension
        const newDimensions = [...objectType.arrayDimensions];
        newDimensions.pop(); // Remove last dimension (or first? usually last in type def int[3][2])
        // Wait, int[3][2] usually means array of 3 arrays of 2 ints.
        // Accessing x[0] gives int[2].
        // So we remove the first dimension from the list?
        // My parser stores int[3][2] as [3, 2].
        // If I access x[i], I get the inner array.
        // So I should remove the first element.
        newDimensions.shift();

        return {
          ...objectType,
          arrayDimensions: newDimensions,
        };
      } else if (objectType.pointerDepth > 0) {
        // Pointer indexing (ptr[i] is equivalent to *(ptr + i))
        // Returns the type pointed to
        return {
          ...objectType,
          pointerDepth: objectType.pointerDepth - 1,
        };
      } else {
        throw new CompilerError(
          `Cannot index type ${this.typeToString(objectType)}`,
          "Only arrays and pointers can be indexed.",
          expr.object.location,
        );
      }
    }
    return undefined;
  }

  private checkTernary(expr: AST.TernaryExpr): AST.TypeNode | undefined {
    this.checkExpression(expr.condition);
    const trueType = this.checkExpression(expr.trueExpr);
    const falseType = this.checkExpression(expr.falseExpr);

    if (
      trueType &&
      falseType &&
      !this.areTypesCompatible(trueType, falseType)
    ) {
      throw new CompilerError(
        `Ternary branches have incompatible types: ${this.typeToString(
          trueType,
        )} vs ${this.typeToString(falseType)}`,
        "Both branches of a ternary expression must have the same type.",
        expr.location,
      );
    }
    return trueType;
  }

  private checkCast(expr: AST.CastExpr): AST.TypeNode {
    const sourceType = this.checkExpression(expr.expression);

    if (sourceType && !this.isCastAllowed(sourceType, expr.targetType)) {
      throw new CompilerError(
        `Unsafe cast: cannot cast ${this.typeToString(
          sourceType,
        )} to ${this.typeToString(expr.targetType)}`,
        "This cast is not allowed. Check pointer depths, numeric types, or struct compatibility.",
        expr.location,
      );
    }

    return expr.targetType;
  }

  private checkSizeof(expr: AST.SizeofExpr): AST.TypeNode {
    if ("kind" in expr.target && (expr.target.kind as string) !== "BasicType") {
      // It's an expression
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

  private checkMatch(expr: AST.MatchExpr): AST.TypeNode {
    if ("kind" in expr.value && (expr.value.kind as string) !== "BasicType") {
      this.checkExpression(expr.value as AST.Expression);
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

  private checkArrayLiteral(
    expr: AST.ArrayLiteralExpr,
  ): AST.TypeNode | undefined {
    if (expr.elements.length === 0) return undefined; // Cannot infer type of empty array without context
    const firstType = this.checkExpression(expr.elements[0]!);
    for (let i = 1; i < expr.elements.length; i++) {
      const elemType = this.checkExpression(expr.elements[i]!);
      if (
        firstType &&
        elemType &&
        !this.areTypesCompatible(firstType, elemType)
      ) {
        throw new CompilerError(
          `Array literal has inconsistent element types: ${this.typeToString(firstType)} vs ${this.typeToString(elemType)}`,
          "All elements in an array literal must have the same type.",
          expr.elements[i]!.location,
        );
      }
    }
    if (firstType && firstType.kind === "BasicType") {
      return {
        ...firstType,
        arrayDimensions: [...firstType.arrayDimensions, expr.elements.length], // Or just null for dynamic?
        // For now let's say it's an array of that type.
        // Actually arrayDimensions stores sizes.
      };
    }
    return undefined;
  }

  private checkStructLiteral(
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
      const member = this.resolveStructField(decl, field.name);
      if (!member) {
        throw new CompilerError(
          `Unknown field '${field.name}' in struct '${expr.structName}'`,
          "Check the struct definition for valid fields.",
          field.value.location,
        );
      }

      const valueType = this.checkExpression(field.value);
      if (valueType) {
        const resolvedMemberType = this.resolveType(member.type);
        const resolvedValueType = this.resolveType(valueType);

        if (!this.areTypesCompatible(resolvedMemberType, resolvedValueType)) {
          throw new CompilerError(
            `Type mismatch for field '${
              field.name
            }': expected ${this.typeToString(
              member.type,
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

  private checkTupleLiteral(expr: AST.TupleLiteralExpr): AST.TypeNode {
    const types: AST.TypeNode[] = [];
    for (const el of expr.elements) {
      const t = this.checkExpression(el);
      if (t) types.push(t);
      else
        types.push({
          kind: "BasicType",
          name: "unknown",
          genericArgs: [],
          pointerDepth: 0,
          arrayDimensions: [],
          location: el.location,
        });
    }
    return {
      kind: "TupleType",
      types,
      location: expr.location,
    };
  }

  private checkGenericInstantiation(
    expr: AST.GenericInstantiationExpr,
  ): AST.TypeNode | undefined {
    const baseType = this.checkExpression(expr.base);
    if (!baseType) return undefined;

    if (baseType.kind === "MetaType") {
      const inner = (baseType as any).type;
      if (inner.kind === "BasicType") {
        return {
          kind: "MetaType",
          type: {
            ...inner,
            genericArgs: expr.genericArgs,
          },
          location: expr.location,
        } as any;
      }
    } else if (baseType.kind === "FunctionType") {
      let targetDecl = (baseType as any).declaration as AST.FunctionDecl;
      let targetType = baseType;

      // If we have overloads, try to find the one with matching generic param count
      if ((baseType as any).overloads) {
        const candidates = [
          baseType,
          ...((baseType as any).overloads as AST.TypeNode[]),
        ];
        const match = candidates.find((c) => {
          const d = (c as any).declaration as AST.FunctionDecl;
          return (
            d &&
            d.genericParams &&
            d.genericParams.length === expr.genericArgs.length
          );
        });
        if (match) {
          targetType = match as any;
          targetDecl = (match as any).declaration;
        }
      }

      if (targetDecl) {
        if (targetDecl.genericParams.length !== expr.genericArgs.length) {
          throw new CompilerError(
            `Generic argument count mismatch: expected ${targetDecl.genericParams.length}, got ${expr.genericArgs.length}`,
            "Provide the correct number of generic arguments.",
            expr.location,
          );
        }

        const mapping = new Map<string, AST.TypeNode>();
        for (let i = 0; i < targetDecl.genericParams.length; i++) {
          const param = targetDecl.genericParams[i]!;
          const arg = expr.genericArgs[i]!;

          if (param.constraint) {
            if (!this.areTypesCompatible(param.constraint, arg)) {
              throw new CompilerError(
                `Type '${this.typeToString(arg)}' does not satisfy constraint '${this.typeToString(param.constraint)}'`,
                `Ensure the type argument satisfies the constraint.`,
                expr.location,
              );
            }
          }

          mapping.set(param.name, arg);
        }

        const result = this.substituteType(targetType, mapping);
        // Strip overloads to prevent checkCall from re-resolving
        delete (result as any).overloads;
        return result;
      }
    }
    return baseType;
  }

  private substituteType(
    type: AST.TypeNode,
    mapping: Map<string, AST.TypeNode>,
  ): AST.TypeNode {
    if (type.kind === "BasicType") {
      if (mapping.has(type.name)) {
        const sub = mapping.get(type.name)!;
        if (sub.kind === "BasicType") {
          return {
            ...sub,
            pointerDepth: sub.pointerDepth + type.pointerDepth,
            arrayDimensions: [...sub.arrayDimensions, ...type.arrayDimensions],
            location: type.location,
          };
        }
        if (type.pointerDepth > 0 || type.arrayDimensions.length > 0) {
          // Fallback or error
          return sub;
        }
        return sub;
      }
      return {
        ...type,
        genericArgs: type.genericArgs.map((arg) =>
          this.substituteType(arg, mapping),
        ),
      };
    } else if (type.kind === "FunctionType") {
      return {
        ...type,
        returnType: this.substituteType(type.returnType, mapping),
        paramTypes: type.paramTypes.map((p) => this.substituteType(p, mapping)),
      };
    } else if (type.kind === "TupleType") {
      return {
        ...type,
        types: type.types.map((t) => this.substituteType(t, mapping)),
      };
    }
    return type;
  }

  // --- Helpers ---

  private defineSymbol(
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

  private typeToString(type: AST.TypeNode | undefined): string {
    if (!type) return "unknown";

    if (type.kind === "BasicType") {
      let result = "*".repeat(type.pointerDepth) + type.name;
      if (type.genericArgs.length > 0) {
        result +=
          "<" +
          type.genericArgs.map((t) => this.typeToString(t)).join(", ") +
          ">";
      }
      if (type.arrayDimensions.length > 0) {
        result += type.arrayDimensions
          .map((d) => (d ? `[${d}]` : "[]"))
          .join("");
      }
      return result;
    } else if (type.kind === "FunctionType") {
      const params = type.paramTypes
        .map((p) => this.typeToString(p))
        .join(", ");
      return `(${params}) => ${this.typeToString(type.returnType)}`;
    } else if (type.kind === "TupleType") {
      return "(" + type.types.map((t) => this.typeToString(t)).join(", ") + ")";
    }
    return "unknown";
  }

  // Helper: determine if a basic type name refers to a declared struct
  private isStructType(typeName: string): boolean {
    const symbol = this.currentScope.resolve(typeName);
    return (
      symbol !== undefined &&
      symbol.kind === "Struct" &&
      (symbol.declaration as any).kind === "StructDecl"
    );
  }

  /**
   * Check if two types are exactly the same without any implicit conversions.
   * Used for overload resolution to prefer exact matches.
   */
  private areTypesExactMatch(t1: AST.TypeNode, t2: AST.TypeNode): boolean {
    const rt1 = this.resolveType(t1);
    const rt2 = this.resolveType(t2);

    if (rt1.kind !== rt2.kind) return false;

    if (rt1.kind === "BasicType" && rt2.kind === "BasicType") {
      // Exact name match (no normalization)
      if (rt1.name !== rt2.name) return false;

      // Exact pointer depth match
      if (rt1.pointerDepth !== rt2.pointerDepth) return false;

      // Exact array dimensions match
      if (rt1.arrayDimensions.length !== rt2.arrayDimensions.length)
        return false;
      for (let i = 0; i < rt1.arrayDimensions.length; i++) {
        if (rt1.arrayDimensions[i] !== rt2.arrayDimensions[i]) return false;
      }

      // Exact generic args match
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

  private areTypesCompatible(
    t1: AST.TypeNode,
    t2: AST.TypeNode,
    checkConstraints: boolean = true,
  ): boolean {
    const rt1 = this.resolveType(t1, checkConstraints);
    const rt2 = this.resolveType(t2, checkConstraints);

    // 1. Check basic kind
    if (rt1.kind !== rt2.kind) return false;

    // 2. Handle BasicType
    if (rt1.kind === "BasicType" && rt2.kind === "BasicType") {
      // nullptr handling - compatible with any pointer type
      if (rt1.name === "nullptr" && rt2.name === "nullptr") return true;
      if (rt2.name === "nullptr") {
        return rt1.pointerDepth > 0;
      }
      if (rt1.name === "nullptr") {
        return rt2.pointerDepth > 0;
      }

      // null handling - compatible with any pointer type or struct/object values (non-pointers)
      if (rt1.name === "null" || rt2.name === "null") {
        const other = rt1.name === "null" ? rt2 : rt1;
        if (other.pointerDepth > 0) return true;
        return other.pointerDepth === 0 && this.isStructType(other.name);
      }

      // Void handling
      if (rt1.name === "void" && rt2.name === "void") return true;

      // Allow bidirectional void* compatibility with all pointer types
      // void* can be assigned to any T* and any T* can be assigned to void*
      if (
        (rt1.name === "void" || rt2.name === "void") &&
        rt1.pointerDepth > 0 &&
        rt2.pointerDepth > 0
      ) {
        return true;
      }
      // Exact name match
      if (rt1.name !== rt2.name) {
        // Check inheritance
        if (
          !this.isSubtype(rt2 as AST.BasicTypeNode, rt1 as AST.BasicTypeNode)
        ) {
          return false;
        }
      }

      // Check generic arguments compatibility
      // If rt1 (target/constraint) has NO generic args, but the type definition DOES have generic params,
      // treat it as a wildcard match (e.g. T: Box matches Box<int>).
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

      // Pointer depth match or array decay
      if (rt1.pointerDepth !== rt2.pointerDepth) {
        // ...
        if (
          rt1.pointerDepth === rt2.pointerDepth + 1 &&
          rt2.arrayDimensions.length > 0 &&
          rt1.arrayDimensions.length === rt2.arrayDimensions.length - 1
        ) {
          // ...
        } else {
          return false;
        }
      } else {
        // pointerDepth matches, check array dimensions strictly
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

  private isCastAllowed(source: AST.TypeNode, target: AST.TypeNode): boolean {
    const resolvedSource = this.resolveType(source);
    const resolvedTarget = this.resolveType(target);

    if (this.areTypesCompatible(resolvedSource, resolvedTarget)) return true;

    if (
      resolvedSource.kind === "BasicType" &&
      resolvedTarget.kind === "BasicType"
    ) {
      // Numeric casts
      const numeric = [
        "int",
        "uint",
        "float",
        "double",
        "bool",
        "char",
        "uchar",
        "short",
        "ushort",
        "long",
        "ulong",
        "i8",
        "u8",
        "i16",
        "u16",
        "i32",
        "u32",
        "i64",
        "u64",
      ];
      if (
        numeric.includes(resolvedSource.name) &&
        numeric.includes(resolvedTarget.name) &&
        resolvedSource.pointerDepth === 0 &&
        resolvedTarget.pointerDepth === 0
      ) {
        return true;
      }

      // Pointer casts
      if (resolvedSource.pointerDepth > 0 && resolvedTarget.pointerDepth > 0) {
        return true; // Allow any pointer cast for now (unsafe)
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

  private isImplicitWideningAllowed(
    source: AST.TypeNode,
    target: AST.TypeNode,
  ): boolean {
    const resolvedSource = this.resolveType(source);
    const resolvedTarget = this.resolveType(target);

    if (
      resolvedSource.kind !== "BasicType" ||
      resolvedTarget.kind !== "BasicType"
    )
      return false;
    if (resolvedSource.pointerDepth > 0 || resolvedTarget.pointerDepth > 0)
      return false;
    if (
      resolvedSource.arrayDimensions.length > 0 ||
      resolvedTarget.arrayDimensions.length > 0
    )
      return false;

    const sName = (resolvedSource as AST.BasicTypeNode).name;
    const tName = (resolvedTarget as AST.BasicTypeNode).name;

    const rank: { [key: string]: number } = {
      i1: 1,
      bool: 1,
      i8: 8,
      u8: 8,
      char: 8,
      uchar: 8,
      i16: 16,
      u16: 16,
      short: 16,
      ushort: 16,
      i32: 32,
      u32: 32,
      int: 32,
      uint: 32,
      i64: 64,
      u64: 64,
      long: 64,
      ulong: 64,
    };

    const sRank = rank[sName];
    const tRank = rank[tName];

    if (!sRank || !tRank) return false;

    // Allow widening
    if (sRank < tRank) return true;

    // Allow implicit downsizing from i64/long to int/i32 (common for sizeof results)
    if (
      (sName === "i64" || sName === "long") &&
      (tName === "int" || tName === "i32")
    ) {
      return true;
    }

    // Allow implicit downsizing from u64/ulong to uint/u32
    if (
      (sName === "u64" || sName === "ulong") &&
      (tName === "uint" || tName === "u32")
    ) {
      return true;
    }

    return false;
  }

  private checkAllPathsReturn(stmt: AST.Statement): boolean {
    switch (stmt.kind) {
      case "Block":
        // Check if any statement in the block guarantees all paths return
        // This handles cases like sequential if statements where the last one has an else
        for (const s of stmt.statements) {
          if (this.checkAllPathsReturn(s)) return true;
        }
        return false;
      case "Return":
        return true;
      case "If":
        if (stmt.elseBranch) {
          return (
            this.checkAllPathsReturn(stmt.thenBranch) &&
            this.checkAllPathsReturn(stmt.elseBranch)
          );
        }
        return false; // If without else doesn't guarantee return
      case "Loop":
        // Loops are tricky. Infinite loops technically "return" (never exit).
        // But standard analysis assumes loop might not execute or might break.
        // For now, assume loop doesn't guarantee return unless we analyze breaks.
        return false;
      case "Switch":
        if (!stmt.defaultCase) return false; // Must have default to be exhaustive
        for (const c of stmt.cases) {
          if (!this.checkAllPathsReturn(c.body)) return false;
        }
        return this.checkAllPathsReturn(stmt.defaultCase);
      case "Try":
        // Try block must return, AND all catch blocks must return
        // CatchOther must also return if present?
        // If catchOther is missing, exception propagates (which is a valid exit).
        // So if try returns, and all catches return, we are good.
        // Actually, if an exception is thrown, we exit the function (or go to catch).
        // If try block returns, good.
        // If try block throws, we go to catch.
        // So we need try block to return OR throw (which is handled).
        // Simplified: Try block must return. Catches must return.
        let allCatchesReturn = true;
        for (const c of stmt.catchClauses) {
          if (!this.checkAllPathsReturn(c.body)) allCatchesReturn = false;
        }
        if (stmt.catchOther && !this.checkAllPathsReturn(stmt.catchOther))
          allCatchesReturn = false;

        return this.checkAllPathsReturn(stmt.tryBlock) && allCatchesReturn;
      case "Throw":
        return true; // Throwing is a valid exit path (diverges)
      default:
        return false;
    }
  }

  private resolveType(
    type: AST.TypeNode,
    checkConstraints: boolean = true,
  ): AST.TypeNode {
    if (type.kind === "BasicType") {
      const symbol = this.currentScope.resolve(type.name);

      if (
        checkConstraints &&
        symbol &&
        (symbol.kind === "Struct" || symbol.kind === "TypeAlias")
      ) {
        const decl = symbol.declaration as AST.StructDecl | AST.TypeAliasDecl;
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
                    )}' does not satisfy constraint '${this.typeToString(
                      substitutedConstraint,
                    )}'`,
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

  private resolveStructMember(
    structDecl: AST.StructDecl,
    memberName: string,
  ): AST.StructField | AST.FunctionDecl | undefined {
    // Check current struct
    const member = structDecl.members.find((m) => m.name === memberName);
    if (member) return member;

    // Check parent
    if (structDecl.inheritanceList) {
      for (const typeNode of structDecl.inheritanceList) {
        if (typeNode.kind === "BasicType") {
          const parentSymbol = this.currentScope.resolve(typeNode.name);
          if (
            parentSymbol &&
            parentSymbol.kind === "Struct" &&
            (parentSymbol.declaration as any).kind === "StructDecl"
          ) {
            const found = this.resolveStructMember(
              parentSymbol.declaration as AST.StructDecl,
              memberName,
            );
            if (found) return found;
          }
        }
      }
    }
    return undefined;
  }

  private resolveStructField(
    structDecl: AST.StructDecl,
    fieldName: string,
  ): AST.StructField | undefined {
    const member = this.resolveStructMember(structDecl, fieldName);
    if (member && member.kind === "StructField") return member;
    return undefined;
  }

  private resolveMemberWithContext(
    objectType: AST.BasicTypeNode,
    memberName: string,
  ):
    | {
        members: (AST.StructField | AST.FunctionDecl)[];
        contextType: AST.BasicTypeNode;
        contextDecl: AST.StructDecl;
      }
    | undefined {
    let currentType = objectType;
    let depth = 0;
    while (depth < 100) {
      let decl: AST.StructDecl | undefined;
      if (currentType.resolvedDeclaration) {
        decl = currentType.resolvedDeclaration;
      } else {
        const symbol = this.currentScope.resolve(currentType.name);
        if (
          symbol &&
          symbol.kind === "Struct" &&
          (symbol.declaration as any).kind === "StructDecl"
        ) {
          decl = symbol.declaration as AST.StructDecl;
        }
      }

      if (!decl) return undefined;

      const members = decl.members.filter((m) => m.name === memberName);
      if (members.length > 0)
        return { members, contextType: currentType, contextDecl: decl };

      let foundParent = false;
      if (decl.inheritanceList) {
        for (const typeNode of decl.inheritanceList) {
          if (typeNode.kind === "BasicType") {
            const symbol = this.currentScope.resolve(typeNode.name);
            if (symbol && symbol.kind === "Struct") {
              const resolvedParentRaw = this.resolveType(typeNode);

              if (resolvedParentRaw.kind === "BasicType") {
                const mapping = new Map<string, AST.TypeNode>();
                if (
                  decl.genericParams.length > 0 &&
                  currentType.genericArgs.length === decl.genericParams.length
                ) {
                  for (let i = 0; i < decl.genericParams.length; i++) {
                    mapping.set(
                      decl.genericParams[i]!.name,
                      currentType.genericArgs[i]!,
                    );
                  }
                }

                const substitutedParent = this.substituteType(
                  resolvedParentRaw,
                  mapping,
                );
                if (substitutedParent.kind === "BasicType") {
                  currentType = substitutedParent;
                  depth++;
                  foundParent = true;
                  break;
                }
              }
            }
          }
        }
      }
      if (foundParent) continue;
      return undefined;
    }
    return undefined;
  }

  private isSubtype(
    child: AST.BasicTypeNode,
    parent: AST.BasicTypeNode,
  ): boolean {
    if (child.name === parent.name) return true;

    // Resolve child struct
    const symbol = this.currentScope.resolve(child.name);
    if (
      symbol &&
      symbol.kind === "Struct" &&
      (symbol.declaration as any).kind === "StructDecl"
    ) {
      const decl = symbol.declaration as AST.StructDecl;
      if (decl.inheritanceList) {
        for (const typeNode of decl.inheritanceList) {
          if (typeNode.kind === "BasicType") {
            const parentTypeResolved = this.resolveType(typeNode);
            if (
              parentTypeResolved.kind === "BasicType" &&
              this.isSubtype(parentTypeResolved, parent)
            ) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  private getIntegerSize(type: AST.TypeNode): number {
    if (!this.isIntegerType(type)) return 0;
    const name = (type as AST.BasicTypeNode).name;
    if (["i8", "u8", "char", "uchar"].includes(name)) return 1;
    if (["i16", "u16", "short", "ushort"].includes(name)) return 2;
    if (["i32", "u32", "int", "uint"].includes(name)) return 4;
    if (["i64", "u64", "long", "ulong"].includes(name)) return 8;
    return 4; // Default
  }
}
