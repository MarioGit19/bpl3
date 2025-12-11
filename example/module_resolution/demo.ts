#!/usr/bin/env bun
/**
 * Module Resolution Demo
 * 
 * This script demonstrates how the ModuleResolver works by:
 * 1. Loading all modules and their dependencies
 * 2. Building the dependency graph
 * 3. Computing the topological order for compilation
 * 4. Showing the resolution process step-by-step
 */

import { ModuleResolver } from "../../compiler/middleend/ModuleResolver";
import * as path from "path";

const EXAMPLE_DIR = path.join(__dirname);
const MAIN_FILE = path.join(EXAMPLE_DIR, "main.bpl");

console.log("╔════════════════════════════════════════════════════════════╗");
console.log("║        BPL3 Module Resolution System Demo                ║");
console.log("╚════════════════════════════════════════════════════════════╝\n");

console.log("Entry Point:", path.relative(process.cwd(), MAIN_FILE), "\n");

try {
  // Create resolver
  const resolver = new ModuleResolver();
  
  console.log("📦 Phase 1: Module Discovery");
  console.log("─".repeat(60));
  
  // Resolve all modules
  const modules = resolver.resolveModules(MAIN_FILE);
  
  console.log(`✓ Found ${modules.length} modules\n`);
  
  // Show dependency graph
  console.log("🔗 Phase 2: Dependency Graph");
  console.log("─".repeat(60));
  
  const allModules = resolver.getAllModules();
  for (const module of allModules) {
    const name = path.basename(module.path);
    console.log(`\n📄 ${name}`);
    
    if (module.dependencies.size === 0) {
      console.log("   └─ No dependencies");
    } else {
      const deps = Array.from(module.dependencies).map(d => path.basename(d));
      deps.forEach((dep, i) => {
        const prefix = i === deps.length - 1 ? "└─" : "├─";
        console.log(`   ${prefix} ${dep}`);
      });
    }
  }
  
  // Show compilation order
  console.log("\n\n⚙️  Phase 3: Compilation Order (Topological Sort)");
  console.log("─".repeat(60));
  console.log("Modules must be compiled in this order:\n");
  
  modules.forEach((module, index) => {
    const name = path.basename(module.path);
    const number = (index + 1).toString().padStart(2);
    console.log(`  ${number}. ${name}`);
  });
  
  // Show detailed module info
  console.log("\n\n📊 Phase 4: Module Statistics");
  console.log("─".repeat(60));
  
  let totalStatements = 0;
  let totalImports = 0;
  
  for (const module of modules) {
    const name = path.basename(module.path);
    const stmtCount = module.ast.statements.length;
    const importCount = module.ast.statements.filter(s => s.kind === "Import").length;
    
    totalStatements += stmtCount;
    totalImports += importCount;
    
    console.log(`\n${name}:`);
    console.log(`  Statements: ${stmtCount}`);
    console.log(`  Imports: ${importCount}`);
    console.log(`  Dependencies: ${module.dependencies.size}`);
  }
  
  console.log(`\n${"─".repeat(60)}`);
  console.log(`Total Statements: ${totalStatements}`);
  console.log(`Total Imports: ${totalImports}`);
  console.log(`Total Modules: ${modules.length}`);
  
  console.log("\n\n✅ Module Resolution Complete!");
  console.log("═".repeat(60));
  console.log("\nThe modules can now be type-checked and compiled in the");
  console.log("order shown above, ensuring all dependencies are resolved");
  console.log("before a module is processed.\n");
  
} catch (error) {
  console.error("\n❌ Module Resolution Failed!");
  console.error("─".repeat(60));
  if (error instanceof Error) {
    console.error("Error:", error.message);
    if (error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
  } else {
    console.error("Unknown error:", error);
  }
  process.exit(1);
}
