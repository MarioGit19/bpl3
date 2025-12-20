/**
 * StatementChecker - Handles type checking of statements
 * These methods are designed to be bound to a TypeChecker instance using .call()
 */

import * as AST from "../common/AST";
import { CompilerError, type SourceLocation } from "../common/CompilerError";
import type { Symbol, SymbolKind } from "./SymbolTable";

/**
 * Type for the TypeChecker context that statement checkers need access to
 */
export interface StatementCheckerContext {
  currentScope: any;
  globalScope: any;
  currentFunctionReturnType: AST.TypeNode | undefined;
  loopDepth: number;
  errors: CompilerError[];
  collectAllErrors: boolean;
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
    moduleScope?: any,
  ): void;
  isBoolType(type: AST.TypeNode): boolean;
  makeVoidType(): AST.TypeNode;
  getIntegerConstantValue(expr: AST.Expression): bigint | undefined;
  isIntegerTypeCompatible(val: bigint, targetType: AST.TypeNode): boolean;
  hoistDeclaration(stmt: AST.Statement): void;
}

/**
 * Check a block statement
 */
export function checkBlock(
  this: StatementCheckerContext,
  stmt: AST.BlockStmt,
  newScope: boolean = true,
): void {
  if (newScope) {
    this.currentScope = this.currentScope.enterScope();
  }

  for (const s of stmt.statements) {
    try {
      this.checkStatement(s);
    } catch (e) {
      if (this.collectAllErrors && e instanceof CompilerError) {
        this.errors.push(e);
        continue;
      }
      throw e;
    }
  }

  if (newScope) {
    this.currentScope = this.currentScope.exitScope();
  }
}

/**
 * Check an if statement
 */
export function checkIf(this: StatementCheckerContext, stmt: AST.IfStmt): void {
  const condType = this.checkExpression(stmt.condition);
  if (condType && !this.isBoolType(condType)) {
    throw new CompilerError(
      `If condition must be boolean, got ${this.typeToString(condType)}`,
      "Ensure the condition evaluates to a boolean.",
      stmt.condition.location,
    );
  }
  this.checkStatement(stmt.thenBranch);
  if (stmt.elseBranch) {
    this.checkStatement(stmt.elseBranch);
  }
}

/**
 * Check a loop statement (for/while)
 */
export function checkLoop(
  this: StatementCheckerContext,
  stmt: AST.LoopStmt,
): void {
  this.loopDepth++;
  if (stmt.condition) {
    const condType = this.checkExpression(stmt.condition);
    if (condType && !this.isBoolType(condType)) {
      throw new CompilerError(
        `Loop condition must be boolean, got ${this.typeToString(condType)}`,
        "Ensure the condition evaluates to a boolean.",
        stmt.condition.location,
      );
    }
  }
  checkBlock.call(this, stmt.body);
  this.loopDepth--;
}

/**
 * Check a return statement
 */
export function checkReturn(
  this: StatementCheckerContext,
  stmt: AST.ReturnStmt,
): void {
  const returnType = stmt.value
    ? this.checkExpression(stmt.value)
    : this.makeVoidType();

  if (this.currentFunctionReturnType) {
    const resolvedExpected = this.resolveType(this.currentFunctionReturnType);
    const resolvedActual = returnType
      ? this.resolveType(returnType)
      : this.makeVoidType();

    // Allow integer constant to match any compatible integer type
    if (stmt.value && returnType && returnType.kind === "BasicType") {
      const constVal = this.getIntegerConstantValue(stmt.value);
      if (
        constVal !== undefined &&
        this.isIntegerTypeCompatible(constVal, resolvedExpected)
      ) {
        // Annotate the literal with the target type for code generation
        if (stmt.value.kind === "Literal" || stmt.value.kind === "Unary") {
          stmt.value.resolvedType = resolvedExpected;
        }
        return; // Types are compatible
      }
    }

    if (!this.areTypesCompatible(resolvedExpected, resolvedActual)) {
      throw new CompilerError(
        `Return type mismatch: expected ${this.typeToString(
          resolvedExpected,
        )}, got ${this.typeToString(resolvedActual)}`,
        "Ensure the returned value matches the function's return type.",
        stmt.location,
      );
    }
  }
}

/**
 * Check a try statement
 */
export function checkTry(
  this: StatementCheckerContext,
  stmt: AST.TryStmt,
): void {
  checkBlock.call(this, stmt.tryBlock);

  // Check catch clauses
  for (const clause of stmt.catchClauses) {
    this.currentScope = this.currentScope.enterScope();
    this.defineSymbol(clause.variable, "Variable", clause.type, clause);
    checkBlock.call(this, clause.body);
    this.currentScope = this.currentScope.exitScope();
  }

  // Check catch-all clause if present
  if (stmt.catchOther) {
    checkBlock.call(this, stmt.catchOther);
  }
}

/**
 * Check a throw statement
 */
export function checkThrow(
  this: StatementCheckerContext,
  stmt: AST.ThrowStmt,
): void {
  this.checkExpression(stmt.expression);
}

/**
 * Check a switch statement
 */
export function checkSwitch(
  this: StatementCheckerContext,
  stmt: AST.SwitchStmt,
): void {
  const valueType = this.checkExpression(stmt.expression);

  for (const caseItem of stmt.cases) {
    const patternType = this.checkExpression(caseItem.value);
    if (
      patternType &&
      valueType &&
      !this.areTypesCompatible(valueType, patternType)
    ) {
      throw new CompilerError(
        `Case pattern type ${this.typeToString(
          patternType,
        )} not compatible with switch value type ${this.typeToString(valueType)}`,
        "Ensure case patterns match the switch value type.",
        caseItem.value.location,
      );
    }
    checkBlock.call(this, caseItem.body);
  }

  if (stmt.defaultCase) {
    checkBlock.call(this, stmt.defaultCase);
  }
}

/**
 * Check a break statement
 */
export function checkBreak(
  this: StatementCheckerContext,
  stmt: AST.BreakStmt,
): void {
  if (this.loopDepth === 0) {
    throw new CompilerError(
      "'break' statement outside of loop",
      "Break statements can only be used inside loops.",
      stmt.location,
    );
  }
}

/**
 * Check a continue statement
 */
export function checkContinue(
  this: StatementCheckerContext,
  stmt: AST.ContinueStmt,
): void {
  if (this.loopDepth === 0) {
    throw new CompilerError(
      "'continue' statement outside of loop",
      "Continue statements can only be used inside loops.",
      stmt.location,
    );
  }
}

/**
 * Check a variable declaration
 */
export function checkVariableDecl(
  this: StatementCheckerContext,
  decl: AST.VariableDecl,
): void {
  if (Array.isArray(decl.name)) {
    // Destructuring
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

    const targets = flattenTargets(decl.name);
    const initType = decl.initializer
      ? this.checkExpression(decl.initializer)
      : undefined;

    if (initType && initType.kind === "TupleType") {
      const tupleType = initType as AST.TupleTypeNode;

      const flattenNames = (targets: any[]): string[] => {
        const result: string[] = [];
        for (const t of targets) {
          if (Array.isArray(t)) {
            result.push(...flattenNames(t));
          } else if (typeof t === "string") {
            result.push(t);
          } else if (t && typeof t === "object" && "name" in t) {
            result.push(t.name);
          }
        }
        return result;
      };

      const names = flattenNames(decl.name);

      const assignTypes = (
        names: string[],
        types: AST.TypeNode[],
        explicit: (AST.TypeNode | undefined)[],
      ): void => {
        for (let i = 0; i < names.length; i++) {
          const name = names[i]!;
          const inferredType = types[i];
          const explicitType = explicit[i];

          if (name === "_") continue;

          const finalType = explicitType || inferredType;
          if (finalType) {
            this.defineSymbol(
              name,
              "Variable",
              this.resolveType(finalType),
              decl,
            );
          }
        }
      };

      const explicitTypes = targets.map((t) => t.type);
      assignTypes(names, tupleType.types, explicitTypes);
    } else {
      for (const target of targets) {
        if (target.name === "_") continue;
        const finalType = target.type || initType;
        if (finalType) {
          this.defineSymbol(
            target.name,
            "Variable",
            this.resolveType(finalType),
            decl,
          );
        }
      }
    }

    return;
  }

  // Single variable
  let declaredType = decl.typeAnnotation
    ? this.resolveType(decl.typeAnnotation)
    : undefined;
  let initType: AST.TypeNode | undefined;

  if (decl.initializer) {
    initType = this.checkExpression(decl.initializer);

    if (initType) {
      if (declaredType) {
        const resolvedInit = this.resolveType(initType);
        const resolvedDecl = this.resolveType(declaredType);

        // Check for integer constant compatibility
        const constVal = this.getIntegerConstantValue(decl.initializer);
        if (
          constVal !== undefined &&
          this.isIntegerTypeCompatible(constVal, resolvedDecl)
        ) {
          // Annotate the literal for codegen
          if (
            decl.initializer.kind === "Literal" ||
            decl.initializer.kind === "Unary"
          ) {
            decl.initializer.resolvedType = resolvedDecl;
          }
        } else if (!this.areTypesCompatible(resolvedDecl, resolvedInit)) {
          throw new CompilerError(
            `Type mismatch: cannot assign ${this.typeToString(resolvedInit)} to ${this.typeToString(
              resolvedDecl,
            )}`,
            "Ensure the initializer type matches the declared type.",
            decl.location,
          );
        }
      } else {
        declaredType = this.resolveType(initType);
      }
    }
  }

  if (!declaredType) {
    throw new CompilerError(
      `Cannot infer type for variable '${decl.name}'`,
      "Either provide a type annotation or an initializer.",
      decl.location,
    );
  }

  this.defineSymbol(decl.name as string, "Variable", declaredType, decl);
}

/**
 * Check if all paths in a statement return
 */
export function checkAllPathsReturn(
  this: StatementCheckerContext,
  stmt: AST.Statement,
): boolean {
  switch (stmt.kind) {
    case "Return":
      return true;
    case "Block":
      for (const s of stmt.statements) {
        if (checkAllPathsReturn.call(this, s)) return true;
      }
      return false;
    case "If":
      if (!stmt.elseBranch) return false;
      return (
        checkAllPathsReturn.call(this, stmt.thenBranch) &&
        checkAllPathsReturn.call(this, stmt.elseBranch)
      );
    case "Loop":
      // Loops don't guarantee return
      return false;
    case "Switch":
      // Check if all cases return (simplified)
      if (!stmt.cases || stmt.cases.length === 0) return false;
      for (const c of stmt.cases) {
        let caseReturns = false;
        for (const s of c.body.statements) {
          if (checkAllPathsReturn.call(this, s)) {
            caseReturns = true;
            break;
          }
        }
        if (!caseReturns) return false;
      }
      return true;
    case "Throw":
      return true;
    default:
      return false;
  }
}
