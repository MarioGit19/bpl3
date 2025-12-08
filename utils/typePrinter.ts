import { readFileSync } from "fs";
import { resolve } from "path";
import ProgramExpr from "../parser/expression/programExpr";
import Expression from "../parser/expression/expr";
import ExpressionType from "../parser/expressionType";
import { parseFile } from "./parser";
import { SemanticAnalyzer } from "../transpiler/analysis/SemanticAnalyzer";
import Scope from "../transpiler/Scope";
import type { VariableType } from "../parser/expression/variableDeclarationExpr";
import HelperGenerator from "../transpiler/HelperGenerator";
import type StructDeclarationExpr from "../parser/expression/structDeclarationExpr";

/**
 * Utility to traverse AST and print type information for each expression node.
 * Helps verify that type inference is working correctly throughout the tree.
 */
export class TypePrinter {
  private analyzer: SemanticAnalyzer;
  private sourceLines: string[] = [];
  private indentLevel: number = 0;

  constructor() {
    this.analyzer = new SemanticAnalyzer();
  }

  /**
   * Parse a .x file and print type tree with color-coded output
   */
  printTypeTree(filePath: string): void {
    try {
      const absolutePath = resolve(filePath);
      const sourceCode = readFileSync(absolutePath, "utf-8");
      this.sourceLines = sourceCode.split("\n");

      console.log("\n" + this.bold("=".repeat(80)));
      console.log(this.bold(`Type Tree for: ${filePath}`));
      console.log(this.bold("=".repeat(80)) + "\n");

      const program = parseFile(absolutePath) as ProgramExpr;
      const rootScope = new Scope();

      // Initialize base types in scope (u8, u16, u32, u64, i8, i16, i32, i64, etc.)
      HelperGenerator.generateBaseTypes(rootScope);

      // Run semantic analysis to populate type information
      // Pass true for useScopeAsRoot so that definitions are added to rootScope
      this.analyzer.analyze(program, rootScope, true);

      // Traverse and print
      this.traverseProgram(program, rootScope);

      console.log("\n" + this.bold("=".repeat(80)) + "\n");
    } catch (e: any) {
      console.error(this.red(`Error: ${e.message}`));
      if (e.stack) console.error(e.stack);
    }
  }

  private traverseProgram(program: ProgramExpr, scope: Scope): void {
    if (program.expressions.length === 0) {
      console.log(this.gray("(empty program)"));
      return;
    }

    for (const expr of program.expressions) {
      this.traverseExpression(expr, scope);
    }
  }

  private traverseExpression(expr: Expression, scope: Scope): void {
    const line = expr.startToken?.line || 0;
    const sourceSnippet = this.sourceLines[line - 1] || "";
    const cleanSnippet = sourceSnippet.trim().substring(0, 60);

    const type = this.analyzer.inferType(expr, scope);
    const typeStr = type ? this.typeToString(type) : this.gray("(no type)");

    const exprTypeName = ExpressionType[expr.type] || expr.type;

    console.log(
      `${this.getIndent()} ${this.cyan(exprTypeName)} -> ${this.green(typeStr)}`,
    );

    if (cleanSnippet) {
      console.log(`${this.getIndent()}   ${this.gray(`"${cleanSnippet}"`)}`);
    }

    // Recursively traverse child expressions
    this.indentLevel++;
    this.traverseChildren(expr, scope);
    this.indentLevel--;
  }

  private traverseChildren(expr: Expression, scope: Scope): void {
    switch (expr.type) {
      case ExpressionType.VariableDeclaration: {
        const varDecl = expr as any;
        if (varDecl.value) {
          this.traverseExpression(varDecl.value, scope);
        }
        break;
      }

      case ExpressionType.FunctionDeclaration: {
        const funcDecl = expr as any;
        if (funcDecl.body) {
          // Create a child scope for the function
          const functionScope = new Scope(scope);

          // Register function parameters in the function scope
          if (funcDecl.args && funcDecl.args.length > 0) {
            for (const arg of funcDecl.args) {
              functionScope.define(arg.name, {
                type: "local",
                offset: "0",
                varType: arg.type,
                isParameter: true,
              });
            }
          }

          this.traverseExpression(funcDecl.body, functionScope);
        }
        break;
      }

      case ExpressionType.BlockExpression: {
        const block = expr as any;
        if (block.expressions && Array.isArray(block.expressions)) {
          // Create a child scope for the block to hold local variables
          const blockScope = new Scope(scope);

          for (const child of block.expressions) {
            this.traverseExpression(child, blockScope);

            // After traversing a variable declaration, register it in the block scope
            // so subsequent expressions can see it
            if (child.type === ExpressionType.VariableDeclaration) {
              const varDecl = child as any;
              if (varDecl.name && varDecl.varType) {
                blockScope.define(varDecl.name, {
                  type: "local",
                  offset: "0",
                  varType: varDecl.varType,
                  isParameter: false,
                });
              }
            }
          }
        }
        break;
      }

      case ExpressionType.BinaryExpression: {
        const binExpr = expr as any;
        console.log(`${this.getIndent()} Left:`);
        this.indentLevel++;
        this.traverseExpression(binExpr.left, scope);
        this.indentLevel--;

        console.log(
          `${this.getIndent()} Operator: ${this.yellow(binExpr.operator.value)}`,
        );

        console.log(`${this.getIndent()} Right:`);
        this.indentLevel++;
        this.traverseExpression(binExpr.right, scope);
        this.indentLevel--;
        break;
      }

      case ExpressionType.UnaryExpression: {
        const unary = expr as any;
        console.log(
          `${this.getIndent()} Operator: ${this.yellow(unary.operator.value)}`,
        );
        this.indentLevel++;
        this.traverseExpression(unary.right, scope);
        this.indentLevel--;
        break;
      }

      case ExpressionType.FunctionCall: {
        const call = expr as any;
        console.log(
          `${this.getIndent()} Function: ${this.yellow(call.functionName)}`,
        );
        if (call.args && call.args.length > 0) {
          console.log(`${this.getIndent()} Arguments:`);
          this.indentLevel++;
          for (const arg of call.args) {
            this.traverseExpression(arg, scope);
          }
          this.indentLevel--;
        }
        break;
      }

      case ExpressionType.MethodCallExpr: {
        const method = expr as any;
        console.log(`${this.getIndent()} Receiver:`);
        this.indentLevel++;
        this.traverseExpression(method.receiver, scope);
        this.indentLevel--;

        console.log(
          `${this.getIndent()} Method: ${this.yellow(method.methodName)}`,
        );
        if (method.args && method.args.length > 0) {
          console.log(`${this.getIndent()} Arguments:`);
          this.indentLevel++;
          for (const arg of method.args) {
            this.traverseExpression(arg, scope);
          }
          this.indentLevel--;
        }
        break;
      }

      case ExpressionType.MemberAccessExpression: {
        const member = expr as any;
        console.log(`${this.getIndent()} Object:`);
        this.indentLevel++;
        this.traverseExpression(member.object, scope);
        this.indentLevel--;

        if (member.isIndexAccess) {
          console.log(`${this.getIndent()} Index:`);
          this.indentLevel++;
          this.traverseExpression(member.property, scope);
          this.indentLevel--;
        } else {
          const propName = (member.property as any)?.name || member.property;
          console.log(`${this.getIndent()} Property: ${this.yellow(propName)}`);
        }
        break;
      }

      case ExpressionType.IfExpression: {
        const ifExpr = expr as any;
        console.log(`${this.getIndent()} Condition:`);
        this.indentLevel++;
        this.traverseExpression(ifExpr.condition, scope);
        this.indentLevel--;

        console.log(`${this.getIndent()} Then:`);
        this.indentLevel++;
        this.traverseExpression(ifExpr.thenBranch, scope);
        this.indentLevel--;

        if (ifExpr.elseBranch) {
          console.log(`${this.getIndent()} Else:`);
          this.indentLevel++;
          this.traverseExpression(ifExpr.elseBranch, scope);
          this.indentLevel--;
        }
        break;
      }

      case ExpressionType.CastExpression: {
        const cast = expr as any;
        console.log(`${this.getIndent()} Value:`);
        this.indentLevel++;
        this.traverseExpression(cast.value, scope);
        this.indentLevel--;
        console.log(
          `${this.getIndent()} Target Type: ${this.yellow(this.typeToString(cast.targetType))}`,
        );
        break;
      }

      case ExpressionType.ArrayLiteralExpr: {
        const arr = expr as any;
        if (arr.elements && arr.elements.length > 0) {
          console.log(`${this.getIndent()} Elements:`);
          this.indentLevel++;
          for (const elem of arr.elements) {
            this.traverseExpression(elem, scope);
          }
          this.indentLevel--;
        }
        break;
      }

      case ExpressionType.TupleLiteralExpr: {
        const tuple = expr as any;
        if (tuple.elements && tuple.elements.length > 0) {
          console.log(`${this.getIndent()} Elements:`);
          this.indentLevel++;
          for (const elem of tuple.elements) {
            this.traverseExpression(elem, scope);
          }
          this.indentLevel--;
        }
        break;
      }

      case ExpressionType.ReturnExpression: {
        const ret = expr as any;
        if (ret.value) {
          console.log(`${this.getIndent()} Return Value:`);
          this.indentLevel++;
          this.traverseExpression(ret.value, scope);
          this.indentLevel--;
        }
        break;
      }

      case ExpressionType.LoopExpression: {
        const loop = expr as any;
        console.log(`${this.getIndent()} Body:`);
        this.indentLevel++;
        this.traverseExpression(loop.body, scope);
        this.indentLevel--;
        break;
      }

      case ExpressionType.StructureDeclaration: {
        const struct = expr as StructDeclarationExpr;
        // Check for fields (StructDeclarationExpr uses 'fields')
        const members = struct.fields;
        
        if (members && members.length > 0) {
          console.log(`${this.getIndent()} Members:`);
          this.indentLevel++;
          for (const member of members) {
            const memberType = this.typeToString({
              name: member.type.name,
              isPointer: member.type.isPointer || 0,
              isArray: member.type.isArray || [],
            });
            console.log(
              `${this.getIndent()} ${this.yellow(member.name)}: ${this.green(memberType)}`,
            );
          }
          this.indentLevel--;
        }
        break;
      }

      // Add more cases as needed
    }
  }

  private typeToString(type: VariableType | null): string {
    if (!type) return "(unknown)";

    let result = type.name;

    // Add generic arguments
    if (type.genericArgs && type.genericArgs.length > 0) {
      const args = type.genericArgs
        .map((arg) => this.typeToString(arg))
        .join(", ");
      result += `<${args}>`;
    }

    // Add array dimensions
    if (type.isArray && type.isArray.length > 0) {
      for (const dim of type.isArray) {
        if (dim === -1) {
          result += "[]";
        } else {
          result += `[${dim}]`;
        }
      }
    }

    // Add pointer levels
    for (let i = 0; i < (type.isPointer || 0); i++) {
      result += "*";
    }

    return result;
  }

  private getIndent(): string {
    return "  ".repeat(this.indentLevel);
  }

  // ANSI color codes
  private bold(str: string): string {
    return `\x1b[1m${str}\x1b[0m`;
  }

  private cyan(str: string): string {
    return `\x1b[36m${str}\x1b[0m`;
  }

  private green(str: string): string {
    return `\x1b[32m${str}\x1b[0m`;
  }

  private yellow(str: string): string {
    return `\x1b[33m${str}\x1b[0m`;
  }

  private red(str: string): string {
    return `\x1b[31m${str}\x1b[0m`;
  }

  private gray(str: string): string {
    return `\x1b[90m${str}\x1b[0m`;
  }
}

/**
 * CLI entry point for type printer
 */
export function printTypeTree(filePath: string): void {
  const printer = new TypePrinter();
  printer.printTypeTree(filePath);
}
