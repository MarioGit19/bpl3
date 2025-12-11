#!/usr/bin/env bun
/**
 * Example: Using the Compiler API with Module Resolution
 * 
 * This demonstrates how to programmatically use the BPL3 compiler
 * with full module resolution enabled.
 */

import { Compiler } from "../../compiler";
import * as fs from "fs";
import * as path from "path";

const MAIN_FILE = path.join(__dirname, "main.bpl");

console.log("BPL3 Compiler API Example\n");
console.log("File:", path.relative(process.cwd(), MAIN_FILE));
console.log("─".repeat(60), "\n");

// Read the source code
const sourceCode = fs.readFileSync(MAIN_FILE, "utf-8");

// Option 1: Without module resolution (traditional single-file compilation)
console.log("🔧 Option 1: Traditional Compilation (single file)");
console.log("─".repeat(60));
try {
  const compiler1 = new Compiler({
    filePath: MAIN_FILE,
    verbose: false,
    resolveImports: false, // Disabled
  });
  
  const result1 = compiler1.compile(sourceCode);
  
  if (result1.success) {
    console.log("✓ Compilation successful (but imports not resolved)");
  } else {
    console.log("✗ Compilation failed:", result1.errors?.[0]?.message);
  }
} catch (error) {
  console.log("✗ Error:", error instanceof Error ? error.message : String(error));
}

// Option 2: With full module resolution (recommended for multi-file projects)
console.log("\n\n🚀 Option 2: Two-Phase Compilation (with module resolution)");
console.log("─".repeat(60));
try {
  const compiler2 = new Compiler({
    filePath: MAIN_FILE,
    verbose: true,
    resolveImports: true, // Enabled!
  });
  
  const result2 = compiler2.compile(sourceCode);
  
  if (result2.success) {
    console.log("\n✓ Compilation successful!");
    console.log(`Generated ${result2.output?.split('\n').length} lines of LLVM IR`);
  } else {
    console.log("\n✗ Compilation failed:");
    result2.errors?.forEach(err => console.error("  ", err.message));
  }
} catch (error) {
  console.log("\n✗ Error:", error instanceof Error ? error.message : String(error));
}

console.log("\n" + "─".repeat(60));
console.log("\n💡 Key Differences:\n");
console.log("Without module resolution:");
console.log("  • Faster (single file only)");
console.log("  • Cannot handle imports");
console.log("  • Good for simple scripts\n");
console.log("With module resolution:");
console.log("  • Resolves all dependencies");
console.log("  • Type-checks across modules");
console.log("  • Detects circular dependencies");
console.log("  • Required for multi-file projects\n");
