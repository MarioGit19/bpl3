import ProgramExpr from "../../parser/expression/programExpr";
import Scope from "../Scope";
import Expression from "../../parser/expression/expr";
import ExpressionType from "../../parser/expressionType";
import StructDeclarationExpr from "../../parser/expression/structDeclarationExpr";
import BlockExpr from "../../parser/expression/blockExpr";
import FunctionDeclarationExpr from "../../parser/expression/functionDeclaration";
import FunctionCallExpr from "../../parser/expression/functionCallExpr";
import ReturnExpr from "../../parser/expression/returnExpr";
import ImportExpr from "../../parser/expression/importExpr";
import ArrayLiteralExpr from "../../parser/expression/arrayLiteralExpr";
import ExternDeclarationExpr from "../../parser/expression/externDeclarationExpr";
import LoopExpr from "../../parser/expression/loopExpr";
import IfExpr from "../../parser/expression/ifExpr";
import SwitchExpr from "../../parser/expression/switchExpr";
import TernaryExpr from "../../parser/expression/ternaryExpr";
import { CompilerError, CompilerWarning, ErrorReporter } from "../../errors";
import type { TypeInfo } from "../Scope";
import VariableDeclarationExpr, {
  type VariableType,
} from "../../parser/expression/variableDeclarationExpr";
import IdentifierExpr from "../../parser/expression/identifierExpr";
import BinaryExpr from "../../parser/expression/binaryExpr";
import NumberLiteralExpr from "../../parser/expression/numberLiteralExpr";
import TokenType from "../../lexer/tokenType";
import MemberAccessExpr from "../../parser/expression/memberAccessExpr";
import UnaryExpr from "../../parser/expression/unaryExpr";
import AsmBlockExpr from "../../parser/expression/asmBlockExpr";

export class SemanticAnalyzer {
  private currentReturnType: VariableType | null = null;
  private rootScope: Scope | null = null;
  private initializedVars: Set<string> = new Set();
  private currentFunction: string | null = null;
  public warnings: CompilerWarning[] = [];

  public analyze(program: ProgramExpr, parentScope?: Scope): Scope {
    // Use a child scope to avoid polluting the parent scope (used for transpilation)
    const scope = parentScope ? new Scope(parentScope) : new Scope();
    this.rootScope = scope;
    this.analyzeBlock(program.expressions, scope);
    return scope;
  }

  private analyzeBlock(expressions: Expression[], scope: Scope): void {
    let unreachableDetected = false;
    for (const expr of expressions) {
      if (unreachableDetected) {
        this.warnings.push(
          new CompilerWarning(
            "Unreachable code detected",
            expr.startToken?.line || 0,
          ),
        );
        break; // Only warn once per block
      }

      this.analyzeExpression(expr, scope);

      if (expr.type === ExpressionType.ReturnExpression) {
        unreachableDetected = true;
      }
    }

    // Only check for unused variables in local scopes (functions/blocks)
    // Global variables might be used by other modules
    // if (scope !== this.rootScope) {
    //   this.checkUnusedVariables(scope);
    // }
  }

  private checkUnusedVariables(scope: Scope): void {
    for (const [name, info] of scope.vars) {
      if (
        (info.usageCount === undefined || info.usageCount === 0) &&
        !name.startsWith("_") // Allow variables starting with _ to be unused
      ) {
        const type = info.isParameter ? "Parameter" : "Variable";
        this.warnings.push(
          new CompilerWarning(
            `${type} '${name}' is declared but never used.`,
            info.declaration?.line || 0,
            "Prefix with '_' to suppress this warning.",
          ),
        );
      }
    }
  }

  private analyzeExpression(
    expr: Expression,
    scope: Scope,
    expectedType?: VariableType,
  ): void {
    switch (expr.type) {
      case ExpressionType.VariableDeclaration:
        this.analyzeVariableDeclaration(expr as VariableDeclarationExpr, scope);
        break;
      case ExpressionType.FunctionDeclaration:
        this.analyzeFunctionDeclaration(expr as FunctionDeclarationExpr, scope);
        break;
      case ExpressionType.BlockExpression:
        this.analyzeBlockExpr(expr as BlockExpr, scope);
        break;
      case ExpressionType.IdentifierExpr:
        this.analyzeIdentifier(expr as IdentifierExpr, scope);
        break;
      case ExpressionType.BinaryExpression:
        this.analyzeBinaryExpr(expr as BinaryExpr, scope, expectedType);
        break;
      case ExpressionType.FunctionCall:
        this.analyzeFunctionCall(expr as FunctionCallExpr, scope);
        break;
      case ExpressionType.ImportExpression:
        this.analyzeImportExpression(expr as ImportExpr, scope);
        break;
      case ExpressionType.ExternDeclaration:
        this.analyzeExternDeclaration(expr as ExternDeclarationExpr, scope);
        break;
      case ExpressionType.ReturnExpression:
        this.analyzeReturnExpr(expr as ReturnExpr, scope);
        break;
      case ExpressionType.StructureDeclaration:
        this.analyzeStructDeclaration(expr as StructDeclarationExpr, scope);
        break;
      case ExpressionType.LoopExpression:
        this.analyzeLoopExpr(expr as LoopExpr, scope);
        break;
      case ExpressionType.IfExpression:
        this.analyzeIfExpr(expr as IfExpr, scope);
        break;
      case ExpressionType.SwitchExpression:
        this.analyzeSwitchExpr(expr as SwitchExpr, scope);
        break;
      case ExpressionType.TernaryExpression:
        this.analyzeTernaryExpr(expr as TernaryExpr, scope);
        break;
      case ExpressionType.MemberAccessExpression:
        this.analyzeMemberAccessExpr(expr as MemberAccessExpr, scope);
        break;
      case ExpressionType.UnaryExpression:
        this.analyzeUnaryExpr(expr as UnaryExpr, scope);
        break;
      case ExpressionType.AsmBlockExpression:
        this.analyzeAsmBlockExpr(expr as AsmBlockExpr, scope);
        break;
      case ExpressionType.BreakExpression:
      case ExpressionType.ContinueExpression:
        break;
      // TODO: Add more cases
    }
  }

  private analyzeAsmBlockExpr(expr: AsmBlockExpr, scope: Scope): void {
    for (let i = 0; i < expr.code.length; i++) {
      const token = expr.code[i];
      if (token && token.value === "(") {
        const nextToken = expr.code[i + 1];
        if (nextToken && expr.code[i + 2]?.value === ")") {
          const varName = nextToken.value;
          // Resolve variable to increment usage count
          scope.resolve(varName);
          i += 2; // Skip variable and closing ')'
        }
      }
    }
  }

  private analyzeLoopExpr(expr: LoopExpr, scope: Scope): void {
    // Loop body creates a new scope?
    // In transpiler, LoopExpr calls body.transpile(gen, scope).
    // BlockExpr.transpile creates a new scope if it's not just a list of expressions?
    // Actually BlockExpr.transpile does NOT create a new scope by default unless we enforce it.
    // But SemanticAnalyzer.analyzeBlockExpr creates a new scope.
    // LoopExpr has a body which is a BlockExpr.
    // So analyzeBlockExpr will be called for the body.
    // However, we need to call analyzeExpression on the body.
    this.analyzeExpression(expr.body, scope);
  }

  private analyzeIfExpr(expr: IfExpr, scope: Scope): void {
    this.analyzeExpression(expr.condition, scope);
    this.analyzeExpression(expr.thenBranch, scope);
    if (expr.elseBranch) {
      this.analyzeExpression(expr.elseBranch, scope);
    }
  }

  private analyzeSwitchExpr(expr: SwitchExpr, scope: Scope): void {
    this.analyzeExpression(expr.discriminant, scope);
    for (const caseClause of expr.cases) {
      this.analyzeExpression(caseClause.value, scope);
      this.analyzeExpression(caseClause.body, scope);
    }
    if (expr.defaultCase) {
      this.analyzeExpression(expr.defaultCase, scope);
    }
  }

  private analyzeTernaryExpr(expr: TernaryExpr, scope: Scope): void {
    this.analyzeExpression(expr.condition, scope);
    this.analyzeExpression(expr.trueExpr, scope);
    this.analyzeExpression(expr.falseExpr, scope);
  }

  private inferType(expr: Expression, scope: Scope): VariableType | null {
    switch (expr.type) {
      case ExpressionType.NumberLiteralExpr: {
        const numExpr = expr as NumberLiteralExpr;
        if (numExpr.value.includes(".")) {
          return { name: "f64", isPointer: 0, isArray: [], isLiteral: true };
        }
        return { name: "u64", isPointer: 0, isArray: [], isLiteral: true };
      }
      case ExpressionType.StringLiteralExpr:
        return { name: "u8", isPointer: 1, isArray: [], isLiteral: true };
      case ExpressionType.IdentifierExpr: {
        const ident = expr as IdentifierExpr;
        const resolved = scope.resolve(ident.name);
        return resolved ? resolved.varType : null;
      }
      case ExpressionType.FunctionCall: {
        const call = expr as FunctionCallExpr;
        const func = scope.resolveFunction(call.functionName);
        return func ? func.returnType : null;
      }
      case ExpressionType.BinaryExpression: {
        const binExpr = expr as BinaryExpr;
        const leftType = this.inferType(binExpr.left, scope);
        const rightType = this.inferType(binExpr.right, scope);

        if (!leftType || !rightType) return null;

        // Comparison operators return u8 (boolean)
        if (
          [
            TokenType.EQUAL,
            TokenType.NOT_EQUAL,
            TokenType.LESS_THAN,
            TokenType.GREATER_THAN,
            TokenType.LESS_EQUAL,
            TokenType.GREATER_EQUAL,
            TokenType.AND,
            TokenType.OR,
          ].includes(binExpr.operator.type)
        ) {
          return { name: "u8", isPointer: 0, isArray: [] };
        }

        // Division operators
        if (binExpr.operator.type === TokenType.SLASH) {
          // Float division: always returns float
          if (leftType.name === "f64" || rightType.name === "f64") {
            return { name: "f64", isPointer: 0, isArray: [] };
          }
          // If both are f32, return f32
          if (leftType.name === "f32" && rightType.name === "f32") {
            return { name: "f32", isPointer: 0, isArray: [] };
          }
          // If integers
          const leftSize = this.getIntSize(leftType.name);
          const rightSize = this.getIntSize(rightType.name);
          if (leftSize > 4 || rightSize > 4) {
            // 64-bit int involved
            return { name: "f64", isPointer: 0, isArray: [] };
          }
          // Default to f32 for smaller ints
          return { name: "f32", isPointer: 0, isArray: [] };
        }

        if (binExpr.operator.type === TokenType.SLASH_SLASH) {
          // Integer division
          // If floats involved, return float (floor)
          if (leftType.name === "f64" || rightType.name === "f64") {
            return { name: "f64", isPointer: 0, isArray: [] };
          }
          if (leftType.name === "f32" || rightType.name === "f32") {
            return { name: "f32", isPointer: 0, isArray: [] };
          }
          // Integers -> Integer
          // Return larger type
          const leftSize = this.getIntSize(leftType.name);
          const rightSize = this.getIntSize(rightType.name);
          return leftSize >= rightSize ? leftType : rightType;
        }

        // Arithmetic operators
        // If either is float, result is float (f64 takes precedence)
        if (leftType.name === "f64" || rightType.name === "f64") {
          return { name: "f64", isPointer: 0, isArray: [] };
        }
        if (leftType.name === "f32" || rightType.name === "f32") {
          return { name: "f32", isPointer: 0, isArray: [] };
        }

        // Pointer arithmetic
        if (leftType.isPointer > 0 && rightType.isPointer === 0)
          return leftType;
        if (rightType.isPointer > 0 && leftType.isPointer === 0)
          return rightType;

        // Default to left type (usually u64)
        return leftType;
      }
      case ExpressionType.UnaryExpression: {
        const unaryExpr = expr as any;
        const opType = this.inferType(unaryExpr.right, scope);
        if (!opType) return null;

        if (unaryExpr.operator.value === "&") {
          return {
            name: opType.name,
            isPointer: opType.isPointer + 1,
            isArray: opType.isArray,
          };
        }
        if (unaryExpr.operator.value === "*") {
          if (opType.isPointer > 0) {
            return {
              name: opType.name,
              isPointer: opType.isPointer - 1,
              isArray: opType.isArray,
            };
          }
          // Error: dereferencing non-pointer
          return null;
        }
        return opType;
      }
      case ExpressionType.MemberAccessExpression: {
        const memberExpr = expr as any;
        const objectType = this.inferType(memberExpr.object, scope);
        if (!objectType) return null;

        if (memberExpr.isIndexAccess) {
          if (objectType.isArray.length > 0) {
            return {
              name: objectType.name,
              isPointer: objectType.isPointer,
              isArray: objectType.isArray.slice(1),
            };
          } else if (objectType.isPointer > 0) {
            return {
              name: objectType.name,
              isPointer: objectType.isPointer - 1,
              isArray: [],
            };
          }
          return null;
        } else {
          const typeInfo = scope.resolveType(objectType.name);
          if (!typeInfo) return null;

          const propertyName = (memberExpr.property as any).name;
          const member = typeInfo.members.get(propertyName);
          if (!member) return null;

          return {
            name: member.name,
            isPointer: member.isPointer,
            isArray: member.isArray,
          };
        }
      }
      case ExpressionType.ArrayLiteralExpr: {
        const arrExpr = expr as ArrayLiteralExpr;
        if (arrExpr.elements.length === 0) return null;

        const firstType = this.inferType(arrExpr.elements[0]!, scope);
        if (!firstType) return null;

        return {
          name: firstType.name,
          isPointer: firstType.isPointer,
          isArray: [arrExpr.elements.length, ...firstType.isArray],
          isLiteral: true, // Treat array literal as literal if elements are?
          // Actually, if elements are literals, the array is a literal value.
          // Even if elements are variables, it's an rvalue.
          // But for narrowing, we care if it's a literal number.
          // Here we care if it's a literal array of literal numbers.
          // Let's say yes.
        };
      }
    }
    return null;
  }

  private analyzeBinaryExpr(
    expr: BinaryExpr,
    scope: Scope,
    expectedType?: VariableType,
  ): void {
    // Handle assignment operators
    const assignmentOperators = [
      TokenType.ASSIGN,
      TokenType.PLUS_ASSIGN,
      TokenType.MINUS_ASSIGN,
      TokenType.STAR_ASSIGN,
      TokenType.SLASH_ASSIGN,
      TokenType.PERCENT_ASSIGN,
      TokenType.CARET_ASSIGN,
      TokenType.AMPERSAND_ASSIGN,
      TokenType.PIPE_ASSIGN,
    ];

    if (assignmentOperators.includes(expr.operator.type)) {
      // For assignments, analyze value first
      this.analyzeExpression(expr.right, scope);

      // Then analyze target, but DON'T warn about uninitialized use
      // since we're about to initialize it
      // We'll check the target identifier directly without the warning
      if (expr.left.type === ExpressionType.IdentifierExpr) {
        const targetName = (expr.left as IdentifierExpr).name;
        const resolved = scope.resolve(targetName);
        if (
          !resolved &&
          !scope.resolveFunction(targetName) &&
          !scope.resolveType(targetName)
        ) {
          this.warnings.push(
            new CompilerWarning(
              `Identifier '${targetName}' is not defined`,
              expr.left.startToken?.line || 0,
            ),
          );
        }
        // Mark as initialized
        this.initializedVars.add(targetName);
      } else {
        // For complex left sides (member access, array index, etc.), analyze normally
        this.analyzeExpression(expr.left, scope);
      }

      // Check type compatibility
      const leftType = this.inferType(expr.left, scope);
      const rightType = this.inferType(expr.right, scope);

      if (leftType && rightType) {
        this.checkTypeCompatibilityOrThrow(
          leftType,
          rightType,
          expr.operator.line,
        );
      }
      return;
    }

    this.analyzeExpression(expr.left, scope);
    this.analyzeExpression(expr.right, scope);

    const leftType = this.inferType(expr.left, scope);
    const rightType = this.inferType(expr.right, scope);

    if (leftType && rightType) {
      // Check for shift operations with negative or too large shift amounts
      if (
        expr.operator.type === TokenType.BITSHIFT_LEFT ||
        expr.operator.type === TokenType.BITSHIFT_RIGHT
      ) {
        // Use expected type if available (from variable declaration), otherwise use inferred left type
        const actualLeftType = expectedType || leftType;

        // Check if right operand is a constant we can evaluate
        let shiftAmount: number | null = null;
        if (expr.right.type === ExpressionType.NumberLiteralExpr) {
          shiftAmount = parseInt((expr.right as NumberLiteralExpr).value);
        } else if (expr.right.type === ExpressionType.UnaryExpression) {
          // Handle -1, -2, etc.
          const unaryExpr = expr.right as UnaryExpr;
          if (
            unaryExpr.operator.type === TokenType.MINUS &&
            unaryExpr.right.type === ExpressionType.NumberLiteralExpr
          ) {
            const val = parseInt((unaryExpr.right as NumberLiteralExpr).value);
            shiftAmount = -val;
          }
        }

        if (shiftAmount !== null) {
          const leftSize = this.getIntSize(actualLeftType.name) * 8; // in bits

          if (shiftAmount < 0) {
            throw new CompilerError(
              `Shift by negative amount ${shiftAmount} is undefined behavior`,
              expr.operator.line,
            );
          }

          if (leftSize > 0 && shiftAmount >= leftSize) {
            throw new CompilerError(
              `Shift amount ${shiftAmount} >= width of type ${actualLeftType.name} (${leftSize} bits) is undefined behavior`,
              expr.operator.line,
            );
          }
        } else {
          this.warnings.push(
            new CompilerWarning(
              `Shift amount should be checked at runtime: ensure 0 <= amount < type_width`,
              expr.operator.line,
              "Add bounds check for shift amount to prevent undefined behavior",
            ),
          );
        }

        // Check that we're shifting an integer type (use inferred left type)
        if (leftType.name === "f32" || leftType.name === "f64") {
          throw new CompilerError(
            `Cannot perform bitwise shift on floating-point type ${leftType.name}`,
            expr.operator.line,
          );
        }
      } // Check for modulo by zero
      if (expr.operator.type === TokenType.PERCENT) {
        if (
          expr.right.type === ExpressionType.NumberLiteralExpr &&
          (expr.right as NumberLiteralExpr).value === "0"
        ) {
          throw new CompilerError(
            `Modulo by zero is undefined behavior`,
            expr.operator.line,
          );
        }
      }

      // Check for signed integer overflow in left shift
      if (
        expr.operator.type === TokenType.BITSHIFT_LEFT &&
        this.isSignedInteger(expectedType || leftType)
      ) {
        this.warnings.push(
          new CompilerWarning(
            `Left shift on signed integer type ${(expectedType || leftType).name} may cause overflow`,
            expr.operator.line,
            "Use unsigned types for bitwise operations or ensure no overflow occurs",
          ),
        );
      }

      // Pointer Arithmetic Check
      if (
        (expr.operator.type === TokenType.PLUS ||
          expr.operator.type === TokenType.MINUS) &&
        ((leftType.isPointer > 0 && rightType.isPointer === 0) ||
          (rightType.isPointer > 0 && leftType.isPointer === 0))
      ) {
        // Check if the non-pointer is an integer
        const nonPointerType = leftType.isPointer === 0 ? leftType : rightType;
        if (nonPointerType.name !== "f32" && nonPointerType.name !== "f64") {
          return; // Valid pointer arithmetic
        }
      }

      // Check for pointer-pointer subtraction (valid but should be same type)
      if (
        expr.operator.type === TokenType.MINUS &&
        leftType.isPointer > 0 &&
        rightType.isPointer > 0
      ) {
        if (leftType.name !== rightType.name) {
          this.warnings.push(
            new CompilerWarning(
              `Subtracting pointers of different types (*${leftType.name} - *${rightType.name}) may not produce meaningful result`,
              expr.operator.line,
            ),
          );
        }
        return;
      }

      // Check for invalid pointer arithmetic
      if (
        leftType.isPointer > 0 &&
        rightType.isPointer > 0 &&
        (expr.operator.type === TokenType.PLUS ||
          expr.operator.type === TokenType.STAR ||
          expr.operator.type === TokenType.SLASH ||
          expr.operator.type === TokenType.PERCENT)
      ) {
        throw new CompilerError(
          `Invalid pointer arithmetic: cannot ${expr.operator.value} two pointers`,
          expr.operator.line,
        );
      }

      // Check if types are compatible for binary operation
      if (
        !this.checkTypeCompatibility(leftType, rightType, 0) &&
        !this.checkTypeCompatibility(rightType, leftType, 0)
      ) {
        throw new CompilerError(
          `Type mismatch in binary expression: '${this.printType(leftType)}' and '${this.printType(rightType)}' are not compatible`,
          expr.operator.line,
        );
      }
    }
  }

  private isSignedInteger(type: VariableType): boolean {
    return ["i8", "i16", "i32", "i64"].includes(type.name);
  }

  private checkTypeCompatibility(
    expected: VariableType,
    actual: VariableType,
    line: number,
  ): boolean {
    // Exact match
    if (
      expected.name === actual.name &&
      expected.isPointer === actual.isPointer &&
      expected.isArray.length === actual.isArray.length
    ) {
      return true;
    }

    // Allow numeric promotions
    const isExpectedFloat = expected.name === "f64" || expected.name === "f32";
    const isActualFloat = actual.name === "f64" || actual.name === "f32";
    const isExpectedInt = !isExpectedFloat && expected.isPointer === 0;
    const isActualInt = !isActualFloat && actual.isPointer === 0;

    if (isExpectedFloat && isActualFloat) {
      // Allow f32 -> f64
      if (expected.name === "f64" && actual.name === "f32") return true;
      // Allow f64 -> f32 (lossy but often allowed, or maybe strict?)
      // User asked for strict. Let's allow f32 -> f64 but warn/error on f64 -> f32?
      // For now, let's allow both as they are "compatible" floats.
      return true;
    }

    if (isExpectedFloat && isActualInt) {
      // Allow int -> float
      return true;
    }

    if (isExpectedInt && isActualFloat) {
      // Allow float -> int (truncation)
      return true;
    }

    if (isExpectedInt && isActualInt) {
      // Allow int -> int (size check?)
      // BPL treats most ints as compatible for now.
      // Allow smaller int to larger int (promotion)
      const expectedSize = this.getIntSize(expected.name);
      const actualSize = this.getIntSize(actual.name);
      // Allow all integer conversions (promotion and truncation)
      return true;

      // Allow literal int to smaller int (if it fits, but we can't check value here easily)
      // Assuming user knows what they are doing with literals
      if (actual.isLiteral) return true;
    }

    // Pointers
    if (expected.isPointer > 0 && actual.isPointer > 0) {
      // Allow void* (u8*) to any*?
      if (expected.name === "u8" && expected.isPointer === 1) return true; // void* equivalent
      if (actual.name === "u8" && actual.isPointer === 1) return true; // void* equivalent

      // Handle 'string' alias for *u8
      const expectedName = expected.name === "string" ? "u8" : expected.name;
      const actualName = actual.name === "string" ? "u8" : actual.name;
      if (
        expectedName === actualName &&
        expected.isPointer === actual.isPointer
      )
        return true;
    }

    // Arrays vs Pointers
    if (expected.isArray.length > 0 && actual.isPointer > 0) {
      // Allow *u8 (string literal) to u8[] (array initialization)
      if (
        expected.name === "u8" &&
        actual.name === "u8" &&
        actual.isPointer === 1
      )
        return true;
    }

    if (expected.isPointer > 0 && actual.isArray.length > 0) {
      // Array decays to pointer
      if (
        expected.name === actual.name &&
        expected.isPointer === actual.isArray.length // Simplified check
      ) {
        // Actually array decays to pointer to first element.
        // u8[] -> u8*
        if (
          expected.name === actual.name &&
          expected.isPointer === 1 &&
          actual.isArray.length === 1
        )
          return true;
      }
    }

    // Handle 'string' alias for *u8 (non-pointer context check, though string is usually *u8)
    if (
      expected.name === "string" &&
      actual.name === "u8" &&
      actual.isPointer === 1
    )
      return true;
    if (
      expected.name === "u8" &&
      expected.isPointer === 1 &&
      actual.name === "string"
    )
      return true;

    // Array literal to Array
    if (
      expected.isArray.length > 0 &&
      actual.isArray.length > 0 &&
      actual.isLiteral
    ) {
      if (expected.isArray.length !== actual.isArray.length) return false;
      for (let i = 0; i < expected.isArray.length; i++) {
        if (expected.isArray[i] !== actual.isArray[i]) return false;
      }

      const expectedBase: VariableType = {
        name: expected.name,
        isPointer: expected.isPointer,
        isArray: [],
        isLiteral: false,
      };
      const actualBase: VariableType = {
        name: actual.name,
        isPointer: actual.isPointer,
        isArray: [],
        isLiteral: true,
      };

      return this.checkTypeCompatibility(expectedBase, actualBase, line);
    }

    // Pointer <-> u64 compatibility (unsafe but allowed in systems programming often)
    if (
      (expected.name === "u64" && actual.isPointer > 0) ||
      (expected.isPointer > 0 && actual.name === "u64")
    ) {
      return true;
    }

    return false;
  }

  private checkTypeCompatibilityOrThrow(
    expected: VariableType,
    actual: VariableType,
    line: number,
  ): void {
    if (!this.checkTypeCompatibility(expected, actual, line)) {
      throw new CompilerError(
        `Type mismatch: expected '${this.printType(expected)}', got '${this.printType(actual)}'`,
        line,
      );
    }
  }

  private getIntSize(name: string): number {
    switch (name) {
      case "u8":
      case "i8":
        return 1;
      case "u16":
      case "i16":
        return 2;
      case "u32":
      case "i32":
        return 4;
      case "u64":
      case "i64":
        return 8;
      default:
        return 0; // Not an int
    }
  }

  private printType(type: VariableType): string {
    let s = type.name;
    for (let i = 0; i < type.isPointer; i++) s = "*" + s;
    for (const dim of type.isArray) s += `[${dim}]`;
    return s;
  }

  private analyzeVariableDeclaration(
    expr: VariableDeclarationExpr,
    scope: Scope,
  ): void {
    if (scope.vars.has(expr.name)) {
      throw new CompilerError(
        `Variable '${expr.name}' is already defined in this scope.`,
        expr.startToken?.line || 0,
      );
    }

    if (expr.scope === "global" && scope !== this.rootScope) {
      throw new CompilerError(
        "Global variable declaration should be in the global scope",
        expr.startToken?.line || 0,
      );
    }

    if (expr.value === null && expr.isConst) {
      throw new CompilerError(
        "Const variable must be initialized",
        expr.startToken?.line || 0,
      );
    }

    // Check generic type instantiation
    if (expr.varType.genericArgs && expr.varType.genericArgs.length > 0) {
      try {
        scope.resolveGenericType(expr.varType.name, expr.varType.genericArgs);
      } catch (e: any) {
        throw new CompilerError(e.message, expr.startToken?.line || 0);
      }
    } else {
      const typeInfo = scope.resolveType(expr.varType.name);
      if (
        typeInfo &&
        typeInfo.genericParams &&
        typeInfo.genericParams.length > 0
      ) {
        throw new CompilerError(
          `Type '${expr.varType.name}' is generic but no arguments were provided.`,
          expr.startToken?.line || 0,
        );
      }
    }

    if (expr.value) {
      this.analyzeExpression(expr.value, scope, expr.varType);
      const valueType = this.inferType(expr.value, scope);
      if (valueType) {
        this.checkTypeCompatibilityOrThrow(
          expr.varType,
          valueType,
          expr.startToken?.line || 0,
        );
      }
      // Mark variable as initialized
      this.initializedVars.add(expr.name);
    } else if (expr.scope === "local") {
      // Local variable declared but not initialized
      this.warnings.push(
        new CompilerWarning(
          `Local variable '${expr.name}' declared without initialization`,
          expr.startToken?.line || 0,
          "Initialize variable to prevent undefined behavior",
        ),
      );
    }

    // Define in scope
    scope.define(expr.name, {
      type: expr.scope,
      offset: "0", // Dummy offset
      varType: expr.varType,
      declaration: expr.startToken,
    });
  }

  private analyzeFunctionDeclaration(
    expr: FunctionDeclarationExpr,
    scope: Scope,
  ): void {
    if (scope.resolveFunction(expr.name)) {
      throw new CompilerError(
        `Function '${expr.name}' is already defined.`,
        expr.startToken?.line || 0,
      );
    }

    scope.defineFunction(expr.name, {
      name: expr.name,
      label: expr.name,
      startLabel: expr.name,
      endLabel: expr.name,
      args: expr.args,
      returnType: expr.returnType,
      declaration: expr.startToken,
      isVariadic: expr.isVariadic,
      variadicType: expr.variadicType,
    });

    const functionScope = new Scope(scope);

    // Save current state and create new function context
    const previousInitializedVars = new Set(this.initializedVars);
    const previousFunction = this.currentFunction;
    this.initializedVars = new Set();
    this.currentFunction = expr.name;

    // Define arguments in function scope - they are initialized
    for (const arg of expr.args) {
      functionScope.define(arg.name, {
        type: "local",
        offset: "0",
        varType: arg.type,
        isParameter: true,
      });
      this.initializedVars.add(arg.name); // Parameters are initialized
    }

    const previousReturnType = this.currentReturnType;
    this.currentReturnType = expr.returnType;
    this.analyzeExpression(expr.body, functionScope);

    this.checkUnusedVariables(functionScope);

    // Restore previous state
    this.currentReturnType = previousReturnType;
    this.initializedVars = previousInitializedVars;
    this.currentFunction = previousFunction;
  }

  private analyzeBlockExpr(expr: BlockExpr, scope: Scope): void {
    this.analyzeBlock(expr.expressions, scope);
  }

  private analyzeIdentifier(expr: IdentifierExpr, scope: Scope): void {
    const resolved = scope.resolve(expr.name);
    if (!resolved) {
      // It might be a function call or struct member access handled elsewhere,
      // but if it's a standalone identifier expression, it should be a variable.
      if (!scope.resolveFunction(expr.name)) {
        // Check if it's a type (for sizeof or similar constructs)
        if (!scope.resolveType(expr.name)) {
          this.warnings.push(
            new CompilerWarning(
              `Identifier '${expr.name}' is not defined`,
              expr.startToken?.line || 0,
            ),
          );
        }
      }
    } else if (
      resolved.type === "local" &&
      !this.initializedVars.has(expr.name) &&
      !resolved.isParameter
    ) {
      // Variable is declared but may not be initialized
      console.log(
        `[DEBUG Identifier] '${expr.name}' not in initializedVars:`,
        Array.from(this.initializedVars),
      );
      this.warnings.push(
        new CompilerWarning(
          `Variable '${expr.name}' may be used before initialization`,
          expr.startToken?.line || 0,
          "Initialize variable before use to prevent undefined behavior",
        ),
      );
    }
  }

  private analyzeFunctionCall(expr: FunctionCallExpr, scope: Scope): void {
    const func = scope.resolveFunction(expr.functionName);
    if (!func) {
      throw new CompilerError(
        `Undefined function '${expr.functionName}'`,
        expr.startToken?.line || 0,
      );
    }

    // Check argument count
    if (func.isExternal) {
      if (func.isVariadic) {
        // For variadic/unknown signature external functions, allow more arguments than declared
        if (expr.args.length < func.args.length) {
          throw new CompilerError(
            `Function '${expr.functionName}' expects at least ${func.args.length} arguments, but got ${expr.args.length}`,
            expr.startToken?.line || 0,
          );
        }
      } else {
        // For fixed signature external functions, enforce exact argument count
        if (func.args.length !== expr.args.length) {
          throw new CompilerError(
            `Function '${expr.functionName}' expects ${func.args.length} arguments, but got ${expr.args.length}`,
            expr.startToken?.line || 0,
          );
        }
      }
    } else {
      // For internal functions, enforce exact argument count
      if (func.isVariadic) {
        if (expr.args.length < func.args.length) {
          throw new CompilerError(
            `Function '${expr.functionName}' expects at least ${func.args.length} arguments, but got ${expr.args.length}`,
            expr.startToken?.line || 0,
          );
        }
      } else if (func.args.length !== expr.args.length) {
        throw new CompilerError(
          `Function '${expr.functionName}' expects ${func.args.length} arguments, but got ${expr.args.length}`,
          expr.startToken?.line || 0,
        );
      }
    }

    for (let i = 0; i < expr.args.length; i++) {
      const arg = expr.args[i];
      if (!arg) continue;
      this.analyzeExpression(arg, scope);

      // Check argument type compatibility
      if (i < func.args.length) {
        const argType = this.inferType(arg, scope);
        const param = func.args[i];
        if (param && argType) {
          this.checkTypeCompatibilityOrThrow(
            param.type,
            argType,
            expr.startToken?.line || 0,
          );
        }
      } else if (func.isVariadic && func.variadicType) {
        const argType = this.inferType(arg, scope);
        if (argType) {
          this.checkTypeCompatibilityOrThrow(
            func.variadicType,
            argType,
            expr.startToken?.line || 0,
          );
        }
      }
    }
  }

  private analyzeImportExpression(expr: ImportExpr, scope: Scope): void {
    for (const importItem of expr.importName) {
      if (importItem.type === "type") {
        continue;
      }
      const name = importItem.name;

      if (scope.resolveFunction(name)) {
        continue;
      }

      let returnType: VariableType = { name: "i32", isPointer: 0, isArray: [] };

      if (name === "malloc" || name === "calloc" || name === "realloc") {
        returnType = { name: "u8", isPointer: 1, isArray: [] };
      }

      scope.defineFunction(name, {
        name: name,
        label: name,
        args: [],
        returnType: returnType,
        startLabel: name,
        endLabel: name,
        isExternal: true,
        isVariadic: true, // Imported functions are assumed variadic/unknown signature unless declared
      });
    }
  }

  private analyzeExternDeclaration(
    expr: ExternDeclarationExpr,
    scope: Scope,
  ): void {
    const existingFunc = scope.resolveFunction(expr.name);
    // If it's not defined, we can define it now (assuming it's an extern that didn't need an import, or import was implicit)
    // But based on ExternDeclarationExpr logic, it expects it to be defined.
    // However, for Semantic Analysis, we might want to be more lenient or strict.
    // If we follow the transpiler logic:
    if (!existingFunc || !existingFunc.isExternal) {
      // If it's not defined, let's define it as external.
      // This allows 'extern' to declare functions without 'import' if they are linked otherwise.
      // But the original logic threw an error. Let's stick to the original logic but maybe relax it if it's not found?
      // Actually, if I import from libc, it's defined.
      // If I just say 'extern foo', it should probably be defined.

      // Let's define it if it doesn't exist, assuming the user knows what they are doing (linking against something).
      // But wait, the original code threw an error.
      // "Function ${this.name} is not defined, or it's already defined and is not external."

      // If I change this behavior, I might break something.
      // But if I don't define it in ImportExpr, then it won't be defined here.
      // I added analyzeImportExpression, so it should be defined if imported.

      if (!existingFunc) {
        // Maybe allow defining it?
        // For now, let's define it.
        scope.defineFunction(expr.name, {
          args: expr.args,
          returnType: expr.returnType,
          endLabel: expr.name + "_end",
          label: expr.name,
          name: expr.name,
          startLabel: expr.name,
          isExternal: true,
          isVariadic: expr.isVariadic, // Explicit extern declaration implies fixed signature unless we add support for '...'
        });
        return;
      }

      if (!existingFunc.isExternal) {
        throw new CompilerError(
          `Function '${expr.name}' is already defined and is not external.`,
          expr.startToken?.line || 0,
        );
      }
    }

    // Update the existing function definition with types
    scope.defineFunction(expr.name, {
      ...existingFunc,
      args: expr.args,
      returnType: expr.returnType,
      isVariadic: expr.isVariadic, // Explicit extern declaration makes it fixed signature
    });
  }

  private analyzeReturnExpr(expr: ReturnExpr, scope: Scope): void {
    if (this.currentReturnType === null) {
      // Return outside function? Or void function?
      // If we are in a function, currentReturnType should be set (even if null/void)
      // But wait, if function returns void, expr.returnType is null?
      // Let's assume currentReturnType is null means "not in function" or "void return".
      // But I initialized it to null.
      // If I am in global scope, it is null.
      // If I am in a function with no return type, it is null?
      // Let's check FunctionDeclarationExpr.returnType. It is VariableType | null.
    }

    if (expr.value) {
      this.analyzeExpression(expr.value, scope);
      const valueType = this.inferType(expr.value, scope);

      if (this.currentReturnType) {
        if (valueType) {
          this.checkTypeCompatibilityOrThrow(
            this.currentReturnType,
            valueType,
            expr.startToken?.line || 0,
          );
        }
      } else {
        // Function is void, but returning a value
        throw new CompilerError(
          "Void function cannot return a value",
          expr.startToken?.line || 0,
        );
      }
    } else {
      // Return void
      if (this.currentReturnType) {
        // Function expects a value
        throw new CompilerError(
          `Function expects return type '${this.printType(this.currentReturnType)}', but got void`,
          expr.startToken?.line || 0,
        );
      }
    }
  }

  private analyzeStructDeclaration(
    expr: StructDeclarationExpr,
    scope: Scope,
  ): void {
    if (scope.types.has(expr.name)) {
      throw new CompilerError(
        `Type '${expr.name}' is already defined.`,
        expr.startToken?.line || 0,
      );
    }

    if (expr.genericParams.length > 0) {
      const structTypeInfo: TypeInfo = {
        name: expr.name,
        isArray: [],
        isPointer: 0,
        members: new Map(),
        size: 0,
        alignment: 1,
        isPrimitive: false,
        info: {
          description: `Generic Structure ${expr.name}`,
        },
        genericParams: expr.genericParams,
        genericFields: expr.fields.map((f) => ({
          name: f.name,
          type: f.type,
        })),
        declaration: expr.startToken,
      };
      scope.defineType(expr.name, structTypeInfo);
      return;
    }

    const structTypeInfo: TypeInfo = {
      name: expr.name,
      isArray: [],
      isPointer: 0,
      members: new Map(),
      size: 0,
      alignment: 1,
      isPrimitive: false,
      info: {
        description: `Structure ${expr.name}`,
      },
    };

    const toAddLater: string[] = [];
    let currentOffset = 0;
    let maxAlignment = 1;

    expr.fields.forEach((field) => {
      const fieldTypeInfo = scope.resolveType(field.type.name);

      if (
        field.type.name === expr.name &&
        (field.type.isPointer > 0 || field.type.isArray.length > 0)
      ) {
        toAddLater.push(field.name);
        return;
      } else if (field.type.name === expr.name) {
        throw new CompilerError(
          `Direct recursive struct '${expr.name}' field '${field.name}' is not allowed without pointer or array.`,
          expr.startToken?.line || 0,
        );
      } else if (!fieldTypeInfo) {
        throw new CompilerError(
          `Unknown type '${field.type.name}' for field '${field.name}' in struct '${expr.name}'`,
          expr.startToken?.line || 0,
        );
      }

      let fieldSize = fieldTypeInfo.size;
      let fieldAlignment = fieldTypeInfo.alignment || 1;

      if (field.type.isPointer > 0) {
        fieldSize = 8;
        fieldAlignment = 8;
      } else if (field.type.isArray.length > 0) {
        fieldSize =
          fieldTypeInfo.size * field.type.isArray.reduce((a, b) => a * b, 1);
        fieldAlignment = fieldTypeInfo.alignment || 1;
      }

      // Calculate padding
      const padding =
        (fieldAlignment - (currentOffset % fieldAlignment)) % fieldAlignment;
      currentOffset += padding;

      structTypeInfo.members.set(field.name, {
        info: { description: `Field ${field.name} of type ${field.type.name}` },
        name: field.type.name,
        isArray: field.type.isArray,
        isPointer: field.type.isPointer,
        size: fieldSize,
        offset: currentOffset,
        alignment: fieldAlignment,
        isPrimitive: fieldTypeInfo.isPrimitive,
        members: fieldTypeInfo.members,
      });

      currentOffset += fieldSize;
      maxAlignment = Math.max(maxAlignment, fieldAlignment);
    });

    toAddLater.forEach((fieldName) => {
      const memberInfo = expr.fields.find((f) => f.name === fieldName);
      const fieldSize = 8;
      const fieldAlignment = 8;

      const padding =
        (fieldAlignment - (currentOffset % fieldAlignment)) % fieldAlignment;
      currentOffset += padding;

      structTypeInfo.members.set(fieldName, {
        info: { description: `Field ${fieldName} of type ${expr.name}` },
        name: memberInfo!.type.name,
        isArray: memberInfo?.type.isArray || [],
        isPointer: memberInfo?.type.isPointer || 0,
        size: fieldSize,
        offset: currentOffset,
        alignment: fieldAlignment,
        isPrimitive: false,
        members: structTypeInfo.members,
      });

      currentOffset += fieldSize;
      maxAlignment = Math.max(maxAlignment, fieldAlignment);
    });

    // Align struct size
    const structPadding =
      (maxAlignment - (currentOffset % maxAlignment)) % maxAlignment;
    structTypeInfo.size = currentOffset + structPadding;
    structTypeInfo.alignment = maxAlignment;
    structTypeInfo.declaration = expr.startToken;

    scope.defineType(expr.name, structTypeInfo);
  }

  private analyzeMemberAccessExpr(expr: MemberAccessExpr, scope: Scope): void {
    this.analyzeExpression(expr.object, scope);
    if (expr.isIndexAccess) {
      this.analyzeExpression(expr.property, scope);
    }
  }

  private analyzeUnaryExpr(expr: UnaryExpr, scope: Scope): void {
    this.analyzeExpression(expr.right, scope);
  }
}
