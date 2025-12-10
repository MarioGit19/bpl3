#!/usr/bin/env bun
/**
 * BPL3 Compiler CLI Tool
 * 
 * Main entry point for the BPL3 compiler command-line interface.
 */

import { Compiler } from "./compiler";
import * as fs from "fs";
import { Command } from "commander";
import { spawnSync } from "child_process";

const program = new Command();

program
  .name("bpl")
  .description("BPL3 Compiler - A modern systems programming language")
  .version("0.2.0");

program
  .argument("<file>", "source file to compile")
  .option("-o, --output <file>", "output file path")
  .option("--emit <type>", "emit type: llvm, ast, tokens", "llvm")
  .option("--run", "run the generated code using lli")
  .option("-v, --verbose", "enable verbose output")
  .option("--ast-pretty", "pretty print AST instead of JSON")
  .action((filePath, options) => {
    try {
      if (!fs.existsSync(filePath)) {
        console.error(`Error: File not found: ${filePath}`);
        process.exit(1);
      }

      const content = fs.readFileSync(filePath, "utf-8");
      
      // Create compiler instance
      const compiler = new Compiler({
        filePath,
        outputPath: options.output,
        emitType: options.emit,
        verbose: options.verbose,
      });

      // Compile
      const result = compiler.compile(content);

      if (!result.success) {
        if (result.errors) {
          for (const error of result.errors) {
            console.error(error.toString());
          }
        }
        process.exit(1);
      }

      // Handle output
      if (options.emit === "ast" && options.astPretty && result.ast) {
        console.log(compiler.printAST(result.ast));
      } else if (result.output) {
        if (options.output) {
          fs.writeFileSync(options.output, result.output);
          if (options.verbose) {
            console.log(`Output written to ${options.output}`);
          }
        } else {
          console.log(result.output);
        }
      }

      // Auto-determine output file for LLVM IR
      if (options.emit === "llvm" && !options.output) {
        const outputPath = filePath.replace(/\.(bpl|x)$/, ".ll");
        fs.writeFileSync(outputPath, result.output!);
        console.log(`LLVM IR written to ${outputPath}`);

        // Run with lli if requested
        if (options.run) {
          if (options.verbose) {
            console.log(`Running with lli...`);
          }
          const runResult = spawnSync("lli", [outputPath], {
            stdio: "inherit",
          });
          process.exit(runResult.status || 0);
        }
      }

    } catch (error) {
      if (error instanceof Error) {
        console.error(`Compilation failed: ${error.message}`);
        if (options.verbose && error.stack) {
          console.error(error.stack);
        }
      } else {
        console.error(`Unexpected error: ${error}`);
      }
      process.exit(1);
    }
  });

program.parse();
