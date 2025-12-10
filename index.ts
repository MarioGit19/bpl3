import { Lexer } from "./compiler/frontend/Lexer";
import { Parser } from "./compiler/frontend/Parser";
import { TypeChecker } from "./compiler/middleend/TypeChecker";
import { CompilerError } from "./compiler/common/CompilerError";
import { ASTPrinter } from "./compiler/common/ASTPrinter";
import { CodeGenerator } from "./compiler/backend/CodeGenerator";
import { Compiler } from "./compiler/index";
import * as fs from "fs";
import { Command } from "commander";
import { spawnSync } from "child_process";

const program = new Command();

program
  .name("bpl")
  .description("BPL3 Compiler")
  .version("0.1.21");

program
  .argument("<file>", "source file to compile")
  .option("-o, --output <file>", "output file path")
  .option("--emit <type>", "emit type: llvm, ast, tokens", "llvm")
  .option("--run", "run the generated code using lli")
  .option("-v, --verbose", "enable verbose output")
  .action((filePath, options) => {
    try {
      if (!fs.existsSync(filePath)) {
        console.error(`Error: File not found: ${filePath}`);
        process.exit(1);
      }

      const content = fs.readFileSync(filePath, "utf-8");
      
      // Check if file has imports - if so, use module resolution
      const hasImports = content.includes("import ");
      
      if (hasImports) {
        // Use the new Compiler API with module resolution
        const compiler = new Compiler({
          filePath,
          outputPath: options.output,
          emitType: options.emit,
          verbose: options.verbose,
          resolveImports: true,
        });
        
        const result = compiler.compile(content);
        
        if (!result.success) {
          if (result.errors) {
            for (const error of result.errors) {
              console.error(error.toString());
            }
          }
          process.exit(1);
        }
        
        if (options.emit === "ast" && result.ast) {
          console.log(JSON.stringify(result.ast, null, 2));
          return;
        }
        
        if (result.output) {
          const outputPath = options.output || filePath.replace(/\.[^/.]+$/, "") + ".ll";
          fs.writeFileSync(outputPath, result.output);
          
          if (options.verbose || (!options.run && options.emit === "llvm")) {
            console.log(`LLVM IR written to ${outputPath}`);
          }
          
          // Run if requested
          if (options.run) {
            const runResult = spawnSync("lli", [outputPath], { stdio: "inherit" });
            if (runResult.status !== 0) {
              process.exit(runResult.status ?? 1);
            }
          }
        }
        
        return;
      }
      
      // Original single-file compilation path
      
      const lexer = new Lexer(content, filePath);
      const tokens = lexer.scanTokens();

      if (options.emit === "tokens") {
        console.log(JSON.stringify(tokens, null, 2));
        return;
      }

      // 2. Parsing
      const parser = new Parser(tokens);
      const ast = parser.parse();

      if (options.emit === "ast") {
        console.log(JSON.stringify(ast, null, 2));
        return;
      }

      // 3. Type Checking
      const typeChecker = new TypeChecker();
      typeChecker.checkProgram(ast);

      if (options.verbose) {
        console.log("Semantic analysis completed successfully.");
        const printer = new ASTPrinter();
        console.log(printer.print(ast));
      }

      // 4. Code Generation
      const generator = new CodeGenerator();
      const ir = generator.generate(ast);

      if (options.emit === "llvm" && !options.output && !options.run) {
        // If no output file and not running, maybe print to stdout?
        // Or default to file.
        // Current behavior was writing to file.
      }

      const outputPath = options.output || filePath.replace(/\.[^/.]+$/, "") + ".ll";
      fs.writeFileSync(outputPath, ir);
      
      if (options.verbose || (!options.run && options.emit === "llvm")) {
        console.log(`LLVM IR written to ${outputPath}`);
      }

      // 5. Run
      if (options.run) {
        const result = spawnSync("lli", [outputPath], { stdio: "inherit" });
        if (result.status !== 0) {
            // console.error(`Program exited with code ${result.status}`);
            process.exit(result.status ?? 1);
        }
      }

    } catch (e) {
      if (e instanceof CompilerError) {
        console.error(e.toString());
      } else {
        console.error(`Error: ${e}`);
        if (e instanceof Error && e.stack && options.verbose) {
            console.error(e.stack);
        }
      }
      process.exit(1);
    }
  });

program.parse();
