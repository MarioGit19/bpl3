/**
 * Module Resolution System
 * 
 * Implements a two-phase module compilation strategy:
 * 1. Dependency Graph Construction: Resolve all imports and build dependency tree
 * 2. Ordered Compilation: Process modules in topological order
 * 
 * This allows for:
 * - Cross-module type checking
 * - Circular dependency detection
 * - Module caching and incremental compilation
 * - Proper symbol resolution across module boundaries
 */

import * as fs from "fs";
import * as path from "path";
import { Lexer } from "../frontend/Lexer";
import { Parser } from "../frontend/Parser";
import { TypeChecker } from "./TypeChecker";
import { SymbolTable } from "./SymbolTable";
import { CompilerError } from "../common/CompilerError";
import type * as AST from "../common/AST";

export interface ModuleInfo {
  /** Absolute path to the module file */
  path: string;
  
  /** Parsed AST */
  ast: AST.Program;
  
  /** Module's symbol table (after type checking) */
  symbolTable?: SymbolTable;
  
  /** Modules this module depends on (imports) */
  dependencies: Set<string>;
  
  /** Whether this module has been type-checked */
  checked: boolean;
  
  /** Exported symbols from this module */
  exports: Map<string, { kind: string; type?: AST.TypeNode }>;
}

export class ModuleResolver {
  /** Cache of loaded modules by absolute path */
  private modules: Map<string, ModuleInfo> = new Map();
  
  /** Standard library location */
  private stdLibPath: string;
  
  /** Module search paths */
  private searchPaths: string[] = [];

  constructor(options: { stdLibPath?: string; searchPaths?: string[] } = {}) {
    this.stdLibPath = options.stdLibPath || path.join(__dirname, "../../lib");
    this.searchPaths = options.searchPaths || [];
  }

  /**
   * Resolve a module path from an import statement
   */
  resolveModulePath(importSource: string, fromFile: string): string {
    // Handle relative imports
    if (importSource.startsWith("./") || importSource.startsWith("../")) {
      const fromDir = path.dirname(fromFile);
      const resolved = path.resolve(fromDir, importSource);
      
      // Try with extensions
      for (const ext of [".x", ".bpl", ""]) {
        const withExt = resolved + ext;
        if (fs.existsSync(withExt)) {
          return withExt;
        }
      }
      
      throw new Error(`Module not found: ${importSource} (resolved to ${resolved})`);
    }
    
    // Handle standard library imports (e.g., "std", "io", "math")
    if (!importSource.includes("/")) {
      const stdPath = path.join(this.stdLibPath, `${importSource}.x`);
      if (fs.existsSync(stdPath)) {
        return stdPath;
      }
    }
    
    // Search in additional paths
    for (const searchPath of this.searchPaths) {
      const resolved = path.join(searchPath, importSource);
      for (const ext of [".x", ".bpl", ""]) {
        const withExt = resolved + ext;
        if (fs.existsSync(withExt)) {
          return withExt;
        }
      }
    }
    
    throw new Error(`Module not found: ${importSource}`);
  }

  /**
   * Load a module and its dependencies recursively
   */
  private loadModule(modulePath: string, visited: Set<string> = new Set()): ModuleInfo {
    // Check cache
    if (this.modules.has(modulePath)) {
      return this.modules.get(modulePath)!;
    }
    
    // Detect circular dependencies
    if (visited.has(modulePath)) {
      throw new Error(`Circular dependency detected: ${modulePath}`);
    }
    visited.add(modulePath);
    
    // Read and parse
    const content = fs.readFileSync(modulePath, "utf-8");
    const lexer = new Lexer(content, modulePath);
    const tokens = lexer.scanTokens();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    
    // Create module info
    const moduleInfo: ModuleInfo = {
      path: modulePath,
      ast,
      dependencies: new Set(),
      checked: false,
      exports: new Map(),
    };
    
    // Cache it immediately to handle circular references
    this.modules.set(modulePath, moduleInfo);
    
    // Find all imports
    for (const stmt of ast.statements) {
      if (stmt.kind === "Import") {
        const importStmt = stmt as AST.ImportStmt;
        try {
          const depPath = this.resolveModulePath(importStmt.source, modulePath);
          moduleInfo.dependencies.add(depPath);
          
          // Recursively load dependency
          this.loadModule(depPath, new Set(visited));
        } catch (error) {
          throw new CompilerError(
            `Failed to resolve import '${importStmt.source}': ${error instanceof Error ? error.message : String(error)}`,
            "Check that the module path is correct and the file exists.",
            importStmt.location
          );
        }
      }
    }
    
    return moduleInfo;
  }

  /**
   * Topological sort of modules based on dependencies
   * Returns modules in order they should be type-checked
   */
  private topologicalSort(entryPoint: string): string[] {
    const sorted: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    const visit = (modulePath: string) => {
      if (visited.has(modulePath)) return;
      
      if (visiting.has(modulePath)) {
        throw new Error(`Circular dependency detected involving: ${modulePath}`);
      }
      
      visiting.add(modulePath);
      
      const module = this.modules.get(modulePath);
      if (!module) {
        throw new Error(`Module not found in cache: ${modulePath}`);
      }
      
      // Visit dependencies first
      for (const dep of module.dependencies) {
        visit(dep);
      }
      
      visiting.delete(modulePath);
      visited.add(modulePath);
      sorted.push(modulePath);
    };
    
    visit(entryPoint);
    return sorted;
  }

  /**
   * Resolve all modules starting from entry point
   * Returns modules in dependency order
   */
  resolveModules(entryFile: string): ModuleInfo[] {
    // Normalize entry file path
    const entryPath = path.resolve(entryFile);
    
    // Load all modules recursively
    this.loadModule(entryPath);
    
    // Get topologically sorted order
    const sortedPaths = this.topologicalSort(entryPath);
    
    // Return module infos in order
    return sortedPaths.map(p => this.modules.get(p)!);
  }

  /**
   * Get a module by path
   */
  getModule(modulePath: string): ModuleInfo | undefined {
    return this.modules.get(path.resolve(modulePath));
  }

  /**
   * Clear module cache
   */
  clearCache() {
    this.modules.clear();
  }

  /**
   * Get all loaded modules
   */
  getAllModules(): ModuleInfo[] {
    return Array.from(this.modules.values());
  }
}
