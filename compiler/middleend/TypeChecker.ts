/**
 * TypeChecker - Main type checking class for BPL
 * Extends TypeCheckerBase and uses modular checker functions
 */

import * as fs from "fs";
import * as path from "path";

import * as AST from "../common/AST";
import { CompilerError, type SourceLocation } from "../common/CompilerError";
import { lexWithGrammar } from "../frontend/GrammarLexer";
import { Parser } from "../frontend/Parser";
import { TokenType } from "../frontend/TokenType";
import type { Symbol, SymbolKind } from "./SymbolTable";
import { SymbolTable } from "./SymbolTable";
import { TypeCheckerBase, getStdLibPath } from "./TypeCheckerBase";
import { initializeBuiltinsInScope } from "./BuiltinTypes";
import {
  TypeUtils,
  TypeSubstitution,
  INTEGER_TYPES,
  KNOWN_TYPES,
  NUMERIC_TYPES,
} from "./TypeUtils";
import { OPERATOR_METHOD_MAP } from "./OverloadResolver";

// Import checker functions
import * as ExprChecker from "./ExpressionChecker";
import * as StmtChecker from "./StatementChecker";
import * as CallChecker from "./CallChecker";

/**
 * TypeChecker implementation that uses modular checker functions
 */
export class TypeChecker extends TypeCheckerBase {
  // ========== Program Checking ==========

  public checkProgram(program: AST.Program, modulePath?: string): void {
    const moduleScope = new SymbolTable(this.globalScope);
    this.currentScope = moduleScope;

    if (modulePath) {
      this.modules.set(modulePath, moduleScope);
    }

    // Pass 1: Hoist declarations
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

  // ========== Declaration Hoisting ==========

  public hoistDeclaration(stmt: AST.Statement): void {
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
      case "EnumDecl":
        this.defineSymbol(stmt.name, "Enum", undefined, stmt);
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
        this.defineSymbol(stmt.name, "TypeAlias", this.resolveType(stmt.type), stmt);
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
        this.registerLinkerSymbol(stmt.name, "function", externType, stmt, true);
        stmt.resolvedType = externType;
        break;
      case "Import":
        this.checkImport(stmt);
        break;
    }
  }

  // ========== Statement Checking ==========

  public checkStatement(stmt: AST.Statement): void {
    switch (stmt.kind) {
      case "VariableDecl":
        this.checkVariableDecl(stmt);
        break;
      case "FunctionDecl":
        this.checkFunctionBody(stmt);
        break;
      case "StructDecl":
        this.checkStructBody(stmt);
        break;
      case "EnumDecl":
        this.checkEnumBody(stmt);
        break;
      case "SpecDecl":
        this.checkSpecBody(stmt);
        break;
      case "TypeAlias":
        this.checkTypeAlias(stmt);
        break;
      case "ExpressionStmt":
        this.checkExpression(stmt.expression);
        break;
      case "Block":
        StmtChecker.checkBlock.call(this as any, stmt);
        break;
      case "If":
        StmtChecker.checkIf.call(this as any, stmt);
        break;
      case "Loop":
        StmtChecker.checkLoop.call(this as any, stmt);
        break;
      case "Return":
        StmtChecker.checkReturn.call(this as any, stmt);
        break;
      case "Break":
        StmtChecker.checkBreak.call(this as any, stmt);
        break;
      case "Continue":
        StmtChecker.checkContinue.call(this as any, stmt);
        break;
      case "Try":
        StmtChecker.checkTry.call(this as any, stmt);
        break;
      case "Throw":
        StmtChecker.checkThrow.call(this as any, stmt);
        break;
      case "Switch":
        StmtChecker.checkSwitch.call(this as any, stmt);
        break;
      case "Import":
      case "Export":
      case "Extern":
        // Already handled in hoisting phase
        break;
    }
  }

  // ========== Expression Checking ==========

  public checkExpression(expr: AST.Expression): AST.TypeNode | undefined {
    let type: AST.TypeNode | undefined;
    switch (expr.kind) {
      case "Literal":
        type = ExprChecker.checkLiteral.call(this as any, expr);
        break;
      case "Identifier":
        type = ExprChecker.checkIdentifier.call(this as any, expr);
        break;
      case "Binary":
        type = ExprChecker.checkBinary.call(this as any, expr);
        break;
      case "Unary":
        type = ExprChecker.checkUnary.call(this as any, expr);
        break;
      case "Assignment":
        type = this.checkAssignment(expr);
        break;
      case "Call":
        type = CallChecker.checkCall.call(this as any, expr);
        break;
      case "Member":
        type = CallChecker.checkMember.call(this as any, expr);
        break;
      case "Index":
        type = CallChecker.checkIndex.call(this as any, expr);
        break;
      case "Ternary":
        type = ExprChecker.checkTernary.call(this as any, expr);
        break;
      case "Cast":
        type = ExprChecker.checkCast.call(this as any, expr);
        break;
      case "Sizeof":
        type = ExprChecker.checkSizeof.call(this as any, expr);
        break;
      case "TypeMatch":
        type = ExprChecker.checkTypeMatch.call(this as any, expr);
        break;
      case "Match":
        type = ExprChecker.checkMatchExpr.call(this as any, expr);
        break;
      case "ArrayLiteral":
        type = ExprChecker.checkArrayLiteral.call(this as any, expr);
        break;
      case "StructLiteral":
        type = ExprChecker.checkStructLiteral.call(this as any, expr);
        break;
      case "TupleLiteral":
        type = ExprChecker.checkTupleLiteral.call(this as any, expr);
        break;
      case "EnumStructVariant":
        type = this.checkEnumStructVariant(expr as AST.EnumStructVariantExpr);
        break;
      case "GenericInstantiation":
        type = this.checkGenericInstantiation(expr);
        break;
    }

    if (type) {
      const resolved = this.resolveType(type);
      expr.resolvedType = resolved;
    }
    return type;
  }

  // ========== Variable Declaration ==========

  private checkVariableDecl(decl: AST.VariableDecl): void {
    StmtChecker.checkVariableDecl.call(this as any, decl);
  }

  // ========== Function Body Checking ==========

  private checkFunctionBody(decl: AST.FunctionDecl): void {
    this.currentScope = this.currentScope.enterScope();

    // Add generic params to scope
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
        } as any
      );
    }

    // Add params to scope
    for (const param of decl.params) {
      this.defineSymbol(param.name, "Variable", this.resolveType(param.type), param as any);
    }

    const prevReturnType = this.currentFunctionReturnType;
    this.currentFunctionReturnType = decl.returnType;

    StmtChecker.checkBlock.call(this as any, decl.body, false);

    // Check return path for non-void functions
    if (decl.returnType.kind === "BasicType" && decl.returnType.name !== "void") {
      if (!StmtChecker.checkAllPathsReturn.call(this as any, decl.body)) {
        throw new CompilerError(
          `Function '${decl.name}' may not return a value on all code paths`,
          "Ensure all paths return a value.",
          decl.location
        );
      }
    }

    this.currentFunctionReturnType = prevReturnType;
    this.currentScope = this.currentScope.exitScope();
  }

  // ========== Struct Body Checking ==========

  private checkStructBody(decl: AST.StructDecl): void {
    this.currentScope = this.currentScope.enterScope();

    // Add generic params
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
        } as any
      );
    }

    // Check inheritance
    for (const parentType of decl.inheritanceList) {
      this.resolveType(parentType);
    }

    // Check member methods
    for (const member of decl.members) {
      if (member.kind === "FunctionDecl") {
        this.checkFunctionBody(member);
      }
    }

    this.currentScope = this.currentScope.exitScope();
  }

  // ========== Enum Body Checking ==========

  private checkEnumBody(decl: AST.EnumDecl): void {
    // Validate variants
    for (const variant of decl.variants) {
      if (variant.dataType) {
        if (variant.dataType.kind === "EnumVariantTuple") {
          for (const type of variant.dataType.types) {
            this.resolveType(type);
          }
        } else if (variant.dataType.kind === "EnumVariantStruct") {
          for (const field of variant.dataType.fields) {
            this.resolveType(field.type);
          }
        }
      }
    }
  }

  // ========== Spec Body Checking ==========

  private checkSpecBody(decl: AST.SpecDecl): void {
    // Validate spec methods
    for (const method of decl.methods) {
      for (const param of method.params) {
        this.resolveType(param.type);
      }
      if (method.returnType) {
        this.resolveType(method.returnType);
      }
    }
  }

  // ========== Type Alias Checking ==========

  private checkTypeAlias(decl: AST.TypeAliasDecl): void {
    this.resolveType(decl.type);
  }

  // ========== Import Handling ==========

  private checkImport(stmt: AST.ImportStmt): void {
    const currentFile = stmt.location.file;
    let importPath: string | undefined;
    let ast: AST.Program | undefined;

    if (this.skipImportResolution) {
      let resolvedImportPath: string | undefined;

      if (stmt.source.startsWith("std/")) {
        const stdLibPath = getStdLibPath();
        resolvedImportPath = path.join(stdLibPath, stmt.source.substring(4));
      } else if (path.isAbsolute(stmt.source)) {
        resolvedImportPath = stmt.source;
      } else {
        const currentDir = path.dirname(currentFile);
        resolvedImportPath = path.resolve(currentDir, stmt.source);
      }

      if (resolvedImportPath) {
        if (this.preLoadedModules.has(resolvedImportPath)) {
          importPath = resolvedImportPath;
          ast = this.preLoadedModules.get(importPath);
        } else {
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
        for (const [modulePath, moduleAst] of this.preLoadedModules) {
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
        throw new CompilerError(
          `Module not found: ${stmt.source}`,
          "Module resolution failed",
          stmt.location
        );
      }
    } else {
      if (stmt.source.startsWith("std/")) {
        const stdLibPath = getStdLibPath();
        const relativePath = stmt.source.substring(4);
        importPath = path.join(stdLibPath, relativePath);
      } else {
        const currentDir = path.dirname(currentFile);
        importPath = path.resolve(currentDir, stmt.source);
      }
    }

    let moduleScope = this.modules.get(importPath!);

    if (!moduleScope) {
      if (!ast) {
        if (!fs.existsSync(importPath!)) {
          throw new CompilerError(
            `Module not found: ${importPath}`,
            "Ensure the file exists.",
            stmt.location
          );
        }

        const content = fs.readFileSync(importPath!, "utf-8");
        const tokens = lexWithGrammar(content, importPath!);
        const parser = new Parser(content, importPath!, tokens);
        ast = parser.parse();
      }

      moduleScope = new SymbolTable();
      this.modules.set(importPath!, moduleScope);
      initializeBuiltinsInScope(moduleScope);

      const prevGlobal = this.globalScope;
      const prevCurrent = this.currentScope;

      this.globalScope = moduleScope;
      this.currentScope = moduleScope;

      for (const s of ast.statements) {
        this.hoistDeclaration(s);
      }

      this.globalScope = prevGlobal;
      this.currentScope = prevCurrent;
    }

    // Import items based on import style
    if (stmt.namespace) {
      const exportedScope = new SymbolTable();
      if (ast) {
        for (const s of ast.statements) {
          if (s.kind === "Export") {
            const symbol = moduleScope!.resolve(s.item);
            if (symbol) {
              this.defineImportedSymbol(symbol.name, symbol, exportedScope);
            }
          }
        }
      }
      this.defineSymbol(stmt.namespace, "Module", undefined, stmt, exportedScope);
    } else if (stmt.importAll) {
      let moduleAst = ast;
      if (!moduleAst && this.skipImportResolution) {
        moduleAst = this.preLoadedModules.get(importPath!);
      }
      if (moduleAst) {
        for (const s of moduleAst.statements) {
          if (s.kind === "Export") {
            const symbol = moduleScope!.resolve(s.item);
            if (symbol) {
              this.defineImportedSymbol(symbol.name, symbol);
            }
          }
        }
      }
    }

    for (const item of stmt.items) {
      let isExported = false;
      let exportedSymbol: Symbol | undefined;

      if (ast) {
        for (const s of ast.statements) {
          if (s.kind === "Export" && s.item === item.name) {
            isExported = true;
            exportedSymbol = moduleScope!.resolve(item.name);
            break;
          }
        }
      }

      if (!isExported || !exportedSymbol) {
        throw new CompilerError(
          `Module '${stmt.source}' does not export '${item.name}'`,
          "Ensure the symbol is exported.",
          stmt.location
        );
      }

      this.defineImportedSymbol(item.alias || item.name, exportedSymbol);
    }
  }

  // ========== Complex Expression Checkers ==========
  // These need to remain in the main class due to complexity

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
            valueType
          )} to ${this.typeToString(targetType)}`,
          "The assigned value is not compatible with the target variable's type.",
          expr.location
        );
      }
    }
    return targetType;
  }

  private checkEnumStructVariant(expr: AST.EnumStructVariantExpr): AST.TypeNode | undefined {
    const symbol = this.currentScope.resolve(expr.enumName);
    if (!symbol || symbol.kind !== "Enum") {
      throw new CompilerError(
        `Unknown enum '${expr.enumName}'`,
        "Ensure the enum is defined.",
        expr.location
      );
    }

    const enumDecl = symbol.declaration as AST.EnumDecl;
    const variant = enumDecl.variants.find((v) => v.name === expr.variantName);

    if (!variant) {
      throw new CompilerError(
        `Unknown variant '${expr.variantName}' in enum '${expr.enumName}'`,
        "Check the enum definition.",
        expr.location
      );
    }

    if (!variant.dataType || variant.dataType.kind !== "EnumVariantStruct") {
      throw new CompilerError(
        `Variant '${expr.variantName}' is not a struct variant`,
        "Use tuple syntax for tuple variants.",
        expr.location
      );
    }

    // Validate fields
    const expectedFields = new Map(variant.dataType.fields.map((f) => [f.name, f.type]));
    for (const field of expr.fields) {
      if (!expectedFields.has(field.name)) {
        throw new CompilerError(
          `Unknown field '${field.name}' in variant '${expr.variantName}'`,
          "Check the variant definition.",
          field.value.location
        );
      }

      const expectedType = expectedFields.get(field.name)!;
      const valueType = this.checkExpression(field.value);
      if (valueType && !this.areTypesCompatible(expectedType, valueType)) {
        throw new CompilerError(
          `Type mismatch for field '${field.name}': expected ${this.typeToString(
            expectedType
          )}, got ${this.typeToString(valueType)}`,
          "Field value must match the declared type.",
          field.value.location
        );
      }
    }

    return {
      kind: "BasicType",
      name: expr.enumName,
      genericArgs: [],
      pointerDepth: 0,
      arrayDimensions: [],
      location: expr.location,
    };
  }

  private checkGenericInstantiation(expr: AST.GenericInstantiationExpr): AST.TypeNode | undefined {
    const baseType = this.checkExpression(expr.base);
    if (!baseType) return undefined;

    if ((baseType as any).kind === "MetaType") {
      const innerType = (baseType as any).type as AST.BasicTypeNode;
      // Return MetaType with genericArgs applied
      return {
        kind: "MetaType",
        type: {
          ...innerType,
          genericArgs: expr.genericArgs,
        },
        location: expr.location,
      } as any;
    }

    return baseType;
  }

  // ========== Overload Resolution ==========

  protected resolveOverload(
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
    const viableCandidates: { symbol: Symbol; inferredArgs?: AST.TypeNode[] }[] = [];

    for (const c of candidates) {
      const ft = c.type as AST.FunctionTypeNode;
      const decl = c.declaration as AST.FunctionDecl | AST.ExternDecl;

      if (ft.isVariadic) {
        if (ft.paramTypes.length > argTypes.length) continue;
      } else {
        if (ft.paramTypes.length !== argTypes.length) continue;
      }

      if (genericArgs.length > 0) {
        if (decl.kind !== "FunctionDecl") continue;
        if (decl.genericParams.length !== genericArgs.length) continue;
        viableCandidates.push({ symbol: c });
      } else {
        if (decl.kind === "FunctionDecl" && decl.genericParams.length > 0) {
          continue;
        }
        viableCandidates.push({ symbol: c });
      }
    }

    if (viableCandidates.length === 0) {
      throw new CompilerError(
        `No matching function for call to '${name}' with ${argTypes.length} arguments.`,
        `Available overloads:\n${candidates.map((c) => this.typeToString(c.type!)).join("\n")}`,
        location
      );
    }

    // Find best match
    for (const vc of viableCandidates) {
      const c = vc.symbol;
      const decl = c.declaration as AST.FunctionDecl | AST.ExternDecl;
      const args = genericArgs.length > 0 ? genericArgs : vc.inferredArgs;

      let type = c.type as AST.FunctionTypeNode;
      if (args && decl.kind === "FunctionDecl") {
        const map = new Map<string, AST.TypeNode>();
        for (let i = 0; i < decl.genericParams.length; i++) {
          map.set(decl.genericParams[i]!.name, args[i]!);
        }
        type = this.substituteType(c.type!, map) as AST.FunctionTypeNode;
      }

      let compatible = true;
      for (let i = 0; i < type.paramTypes.length; i++) {
        if (!argTypes[i]) {
          compatible = false;
          break;
        }
        if (!this.areTypesCompatible(type.paramTypes[i]!, argTypes[i]!)) {
          compatible = false;
          break;
        }
      }

      if (compatible) {
        return { symbol: c, type, declaration: decl, genericArgs: args };
      }
    }

    throw new CompilerError(
      `No matching function for call to '${name}' with provided argument types.`,
      `Available overloads:\n${candidates.map((c) => this.typeToString(c.type!)).join("\n")}`,
      location
    );
  }

  // ========== Operator Overload Resolution ==========

  protected findOperatorOverload(
    targetType: AST.TypeNode,
    methodName: string,
    paramTypes: AST.TypeNode[]
  ): AST.FunctionDecl | undefined {
    if (targetType.kind !== "BasicType") return undefined;
    if (targetType.arrayDimensions.length > 0) return undefined;

    const basicType = targetType as AST.BasicTypeNode;
    const memberContext = this.resolveMemberWithContext(basicType, methodName);
    if (!memberContext) return undefined;

    const methods = memberContext.members.filter(
      (m) => m.kind === "FunctionDecl"
    ) as AST.FunctionDecl[];
    if (methods.length === 0) return undefined;

    // Build type substitution for generics
    const typeSubstitutionMap = new Map<string, AST.TypeNode>();
    if (basicType.genericArgs.length > 0) {
      const decl = basicType.resolvedDeclaration;
      if (decl && decl.genericParams) {
        for (let i = 0; i < decl.genericParams.length; i++) {
          typeSubstitutionMap.set(decl.genericParams[i]!.name, basicType.genericArgs[i]!);
        }
      }
    }

    // Find matching method
    for (const method of methods) {
      if (method.isStatic) continue;

      // Check parameter count (excluding 'this')
      const methodParams = method.params.slice(1);
      if (methodParams.length !== paramTypes.length) continue;

      // Check parameter types
      let matches = true;
      for (let i = 0; i < paramTypes.length; i++) {
        let expectedType = methodParams[i]!.type;
        if (typeSubstitutionMap.size > 0) {
          expectedType = this.substituteType(expectedType, typeSubstitutionMap);
        }
        if (!this.areTypesCompatible(expectedType, paramTypes[i]!)) {
          matches = false;
          break;
        }
      }

      if (matches) return method;
    }

    return undefined;
  }

  // ========== Match Pattern Checking ==========

  public checkMatchExhaustiveness(expr: AST.MatchExpr, enumDecl: AST.EnumDecl): void {
    const coveredVariants = new Set<string>();
    let hasWildcard = false;

    for (const arm of expr.arms) {
      if (arm.pattern.kind === "PatternWildcard") {
        hasWildcard = true;
        break;
      } else if (
        arm.pattern.kind === "PatternEnum" ||
        arm.pattern.kind === "PatternEnumTuple" ||
        arm.pattern.kind === "PatternEnumStruct"
      ) {
        coveredVariants.add(arm.pattern.variantName);
      }
    }

    if (!hasWildcard) {
      const allVariants = new Set(enumDecl.variants.map((v) => v.name));
      const missingVariants = [...allVariants].filter((v) => !coveredVariants.has(v));

      if (missingVariants.length > 0) {
        throw new CompilerError(
          `Non-exhaustive match: missing variants: ${missingVariants.join(", ")}`,
          "Match expressions must handle all enum variants or include a wildcard (_) pattern.",
          expr.location
        );
      }
    }
  }

  public checkPattern(pattern: AST.Pattern, enumType: AST.TypeNode, enumDecl: AST.EnumDecl): void {
    if (pattern.kind === "PatternWildcard") return;

    if (pattern.kind === "PatternEnum") {
      const variant = enumDecl.variants.find((v) => v.name === pattern.variantName);
      if (!variant) {
        throw new CompilerError(
          `Unknown variant '${pattern.variantName}' in enum '${enumDecl.name}'`,
          "Check the enum definition.",
          pattern.location
        );
      }
      if (variant.dataType) {
        throw new CompilerError(
          `Variant '${pattern.variantName}' has associated data, use tuple or struct pattern`,
          "This variant requires destructuring.",
          pattern.location
        );
      }
    }

    if (pattern.kind === "PatternEnumTuple") {
      const variant = enumDecl.variants.find((v) => v.name === pattern.variantName);
      if (!variant || variant.dataType?.kind !== "EnumVariantTuple") {
        throw new CompilerError(
          `Variant '${pattern.variantName}' is not a tuple variant`,
          "Use the correct pattern syntax.",
          pattern.location
        );
      }

      if (pattern.bindings.length !== variant.dataType.types.length) {
        throw new CompilerError(
          `Expected ${variant.dataType.types.length} bindings, got ${pattern.bindings.length}`,
          `Variant '${pattern.variantName}' requires ${variant.dataType.types.length} values.`,
          pattern.location
        );
      }

      // Build type substitution for generic enums
      const typeMap = new Map<string, AST.TypeNode>();
      if (enumType.kind === "BasicType" && enumDecl.genericParams) {
        const genericArgs = enumType.genericArgs || [];
        for (let i = 0; i < enumDecl.genericParams.length && i < genericArgs.length; i++) {
          typeMap.set(enumDecl.genericParams[i]!.name, genericArgs[i]!);
        }
      }

      // Bind variables
      for (let i = 0; i < pattern.bindings.length; i++) {
        const bindingName = pattern.bindings[i]!;
        if (bindingName === "_") continue;

        let bindingType = variant.dataType.types[i]!;
        if (typeMap.size > 0) {
          bindingType = this.substituteType(bindingType, typeMap);
        }

        this.defineSymbol(bindingName, "Variable", bindingType, pattern as any);
      }
    }

    if (pattern.kind === "PatternEnumStruct") {
      const variant = enumDecl.variants.find((v) => v.name === pattern.variantName);
      if (!variant || variant.dataType?.kind !== "EnumVariantStruct") {
        throw new CompilerError(
          `Variant '${pattern.variantName}' is not a struct variant`,
          "Use the correct pattern syntax.",
          pattern.location
        );
      }

      const expectedFields = new Map(variant.dataType.fields.map((f) => [f.name, f.type]));
      for (const field of pattern.fields) {
        if (!expectedFields.has(field.fieldName)) {
          throw new CompilerError(
            `Unknown field '${field.fieldName}' in variant '${pattern.variantName}'`,
            "Check the variant definition.",
            pattern.location
          );
        }

        const bindingName = field.binding;
        if (bindingName === "_") continue;

        const bindingType = expectedFields.get(field.fieldName)!;
        this.defineSymbol(bindingName, "Variable", bindingType, pattern as any);
      }
    }
  }

  public checkMatchArmBody(body: AST.Expression | AST.BlockStmt): AST.TypeNode | undefined {
    if (body.kind === "Block") {
      StmtChecker.checkBlock.call(this as any, body);
      return this.makeVoidType();
    } else {
      return this.checkExpression(body);
    }
  }

  // ========== Scope access for checkers ==========

  public checkBlock(stmt: AST.BlockStmt, newScope: boolean = true): void {
    StmtChecker.checkBlock.call(this as any, stmt, newScope);
  }
}
