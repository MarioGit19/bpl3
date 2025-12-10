/**
 * BPL3 Compiler Main Entry Point
 *
 * This file orchestrates the compilation pipeline:
 * 1. Frontend: Lexing and Parsing
 * 2. Middleend: Type Checking and Semantic Analysis
 * 3. Backend: Code Generation (LLVM IR)
 */

import { Lexer } from "./frontend/Lexer";
import { Parser } from "./frontend/Parser";
import { TypeChecker } from "./middleend/TypeChecker";
import { CodeGenerator } from "./backend/CodeGenerator";
import { CompilerError } from "./common/CompilerError";
import { ASTPrinter } from "./common/ASTPrinter";
import { ModuleResolver } from "./middleend/ModuleResolver";
import * as path from "path";
import type * as AST from "./common/AST";

export interface CompilerOptions {
  filePath: string;
  outputPath?: string;
  emitType?: "llvm" | "ast" | "tokens";
  verbose?: boolean;
  resolveImports?: boolean; // New option for full module resolution
}

export interface CompilationResult {
  success: boolean;
  output?: string;
  errors?: CompilerError[];
  ast?: AST.Program;
}

export class Compiler {
  private options: CompilerOptions;

  constructor(options: CompilerOptions) {
    this.options = options;
  }

  /**
   * Main compilation function
   */
  compile(sourceCode: string): CompilationResult {
    try {
      // Check if we should use full module resolution
      if (this.options.resolveImports) {
        return this.compileWithModuleResolution();
      }

      // 1. Frontend: Lexing
      if (this.options.verbose) {
        console.log("[Frontend] Lexical Analysis...");
      }
      const lexer = new Lexer(sourceCode, this.options.filePath);
      const tokens = lexer.scanTokens();

      if (this.options.emitType === "tokens") {
        return {
          success: true,
          output: JSON.stringify(tokens, null, 2),
        };
      }

      // 2. Frontend: Parsing
      if (this.options.verbose) {
        console.log("[Frontend] Syntax Analysis...");
      }
      const parser = new Parser(tokens);
      const ast = parser.parse();

      if (this.options.emitType === "ast") {
        return {
          success: true,
          output: JSON.stringify(ast, null, 2),
          ast,
        };
      }

      // 3. Middleend: Type Checking
      if (this.options.verbose) {
        console.log("[Middleend] Semantic Analysis...");
      }
      const typeChecker = new TypeChecker();
      typeChecker.checkProgram(ast);

      // 4. Backend: Code Generation
      if (this.options.verbose) {
        console.log("[Backend] Code Generation...");
      }
      const codeGenerator = new CodeGenerator();
      const llvmIR = codeGenerator.generate(ast);

      return {
        success: true,
        output: llvmIR,
        ast,
      };
    } catch (error) {
      if (error instanceof CompilerError) {
        return {
          success: false,
          errors: [error],
        };
      }
      throw error;
    }
  }

  /**
   * Compile with full module resolution (two-phase compilation)
   */
  private compileWithModuleResolution(): CompilationResult {
    try {
      if (this.options.verbose) {
        console.log("[Module Resolution] Resolving dependencies...");
      }

      // 1. Resolve all modules
      const resolver = new ModuleResolver();
      const modules = resolver.resolveModules(this.options.filePath);

      if (this.options.verbose) {
        console.log(`[Module Resolution] Found ${modules.length} modules`);
        for (const mod of modules) {
          console.log(`  - ${mod.path}`);
        }
      }

      // 2. Type check all modules in dependency order
      if (this.options.verbose) {
        console.log("[Middleend] Type checking modules...");
      }

      const typeChecker = new TypeChecker();
      for (const module of modules) {
        if (this.options.verbose) {
          console.log(`  Checking: ${path.basename(module.path)}`);
        }
        typeChecker.checkProgram(module.ast);
        module.checked = true;
      }

      // 3. Merge all module ASTs into a single program for code generation
      // We need all struct declarations, function declarations, etc. from all modules
      const entryModule = modules[modules.length - 1]; // Last in topo order is entry point

      if (!entryModule) {
        throw new Error("No entry module found");
      }

      // Create a combined AST with all declarations from all modules
      const combinedStatements: AST.Statement[] = [];
      const seenDeclarations = new Set<string>(); // Avoid duplicate declarations

      // Add declarations from all modules in dependency order
      for (const module of modules) {
        for (const stmt of module.ast.statements) {
          // Skip imports as they're already resolved
          if (stmt.kind === "Import") {
            continue;
          }

          // Generate a unique key for declarations to avoid duplicates
          let key: string | null = null;
          if (stmt.kind === "StructDecl") {
            key = `struct:${(stmt as AST.StructDecl).name}`;
          } else if (stmt.kind === "FunctionDecl") {
            key = `function:${(stmt as AST.FunctionDecl).name}`;
          } else if (stmt.kind === "Extern") {
            key = `extern:${(stmt as AST.ExternDecl).name}`;
          } else if (stmt.kind === "TypeAlias") {
            key = `type:${(stmt as AST.TypeAliasDecl).name}`;
          } else if (stmt.kind === "VariableDecl") {
            key = `global:${(stmt as AST.VariableDecl).name}`;
          }

          // Add statement if we haven't seen this declaration before
          if (!key || !seenDeclarations.has(key)) {
            if (key) seenDeclarations.add(key);
            combinedStatements.push(stmt);
          }
        }
      }

      const combinedAST: AST.Program = {
        kind: "Program",
        statements: combinedStatements,
        location: entryModule.ast.location, // Use entry module's location
      };

      if (this.options.verbose) {
        console.log("[Backend] Generating code...");
      }

      const codeGenerator = new CodeGenerator();
      const llvmIR = codeGenerator.generate(combinedAST);

      return {
        success: true,
        output: llvmIR,
        ast: combinedAST,
      };
    } catch (error) {
      if (error instanceof CompilerError) {
        return {
          success: false,
          errors: [error],
        };
      }
      throw error;
    }
  }

  /**
   * Pretty print AST
   */
  printAST(ast: AST.Program): string {
    const printer = new ASTPrinter();
    return printer.print(ast);
  }
}

// Export all components for external use
export { Lexer } from "./frontend/Lexer";
export { Parser } from "./frontend/Parser";
export { TypeChecker } from "./middleend/TypeChecker";
export { CodeGenerator } from "./backend/CodeGenerator";
export { CompilerError } from "./common/CompilerError";
export { ASTPrinter } from "./common/ASTPrinter";
export * as AST from "./common/AST";
export { Token } from "./frontend/Token";
export { TokenType } from "./frontend/TokenType";
export { SymbolTable } from "./middleend/SymbolTable";
