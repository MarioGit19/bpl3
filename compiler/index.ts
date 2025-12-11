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
import { ModuleCache } from "./middleend/ModuleCache";
import * as path from "path";
import * as fs from "fs";
import type * as AST from "./common/AST";

export interface CompilerOptions {
  filePath: string;
  outputPath?: string;
  emitType?: "llvm" | "ast" | "tokens";
  verbose?: boolean;
  resolveImports?: boolean; // New option for full module resolution
  useCache?: boolean; // Enable incremental compilation with caching
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
      // Check if we should use cached compilation
      if (this.options.useCache) {
        return this.compileWithCache();
      }

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

      const typeChecker = new TypeChecker({ skipImportResolution: true });

      // Pre-register all modules with TypeChecker
      for (const module of modules) {
        typeChecker.registerModule(module.path, module.ast);
      }

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

          // Skip exports, but keep the declaration inside if it's an inline export (which we removed support for, but just in case)
          // Actually, ExportStmt now references a declaration if it was inline, but we changed parser to not allow inline exports.
          // So ExportStmt just references a name. We can skip ExportStmt.
          if (stmt.kind === "Export") {
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

      // Register struct layouts from all modules explicitly
      // This is needed because CodeGenerator.collectStructLayouts only scans the AST it is given.
      // Since we are giving it a combined AST, it SHOULD find all structs.
      // However, if there are name collisions or if we rely on namespacing, we might have issues.
      // But for now, we are merging everything into one flat namespace for CodeGen (except for namespaced access in TypeChecker).
      // Wait, if we have 'std.Point' in TypeChecker, but 'Point' in CodeGen, we need to make sure CodeGen can find 'Point'.
      // In CodeGenerator.ts we added a fallback to strip namespace.
      // So if we have 'struct Point' in combined AST, and we try to access 'std.Point', CodeGen will look for 'Point'.
      // This assumes no name collisions between modules for structs.
      // If 'std.Point' and 'other.Point' both exist, we have a problem in flat CodeGen.
      // But for now, let's assume unique names or that we don't support same-named structs in different modules yet.

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
   * Compile with module caching for incremental builds
   */
  private compileWithCache(): CompilationResult {
    try {
      const projectRoot = path.dirname(this.options.filePath);
      const cache = new ModuleCache(projectRoot);

      if (this.options.verbose) {
        console.log("[Module Cache] Resolving dependencies...");
      }

      // 1. Resolve all modules
      const resolver = new ModuleResolver();
      const modules = resolver.resolveModules(this.options.filePath);

      if (this.options.verbose) {
        console.log(`[Module Cache] Found ${modules.length} modules`);
      }

      // 2. Type check all modules in dependency order
      const typeChecker = new TypeChecker();
      for (const module of modules) {
        typeChecker.checkProgram(module.ast);
        module.checked = true;
      }

      // 3. Generate combined LLVM IR (for now, until we implement proper per-module compilation)
      // Create a combined AST with all declarations from all modules
      const combinedStatements: AST.Statement[] = [];
      const seenDeclarations = new Set<string>();

      for (const module of modules) {
        for (const stmt of module.ast.statements) {
          if (stmt.kind === "Import") {
            continue;
          }

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

          if (!key || !seenDeclarations.has(key)) {
            if (key) seenDeclarations.add(key);
            combinedStatements.push(stmt);
          }
        }
      }

      const combinedAST: AST.Program = {
        kind: "Program",
        statements: combinedStatements,
        location: modules[modules.length - 1]!.ast.location,
      };

      // Hash the combined content for caching
      const entryModule = modules[modules.length - 1]!;
      const allContent = modules
        .map((m) => fs.readFileSync(m.path, "utf-8"))
        .join("\n");

      if (this.options.verbose) {
        console.log("[Module Cache] Compiling modules...");
      }

      const codeGenerator = new CodeGenerator();
      const llvmIR = codeGenerator.generate(combinedAST);

      const objectFile = cache.compileModule(
        entryModule.path,
        allContent,
        llvmIR,
        this.options.verbose,
      );

      const objectFiles = [objectFile];

      // 4. Link all object files
      const outputPath =
        this.options.outputPath ||
        this.options.filePath.replace(/\.[^/.]+$/, "");

      if (this.options.verbose) {
        console.log("[Module Cache] Linking modules...");
      }

      cache.linkModules(objectFiles, outputPath, this.options.verbose);

      if (this.options.verbose) {
        const stats = cache.getStats();
        console.log(
          `[Module Cache] Cache stats: ${stats.totalModules} modules, ${(stats.cacheSize / 1024).toFixed(2)} KB`,
        );
      }

      return {
        success: true,
        output: `Executable created: ${outputPath}`,
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
