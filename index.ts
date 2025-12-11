import { Lexer } from "./compiler/frontend/Lexer";
import { Parser } from "./compiler/frontend/Parser";
import { TypeChecker } from "./compiler/middleend/TypeChecker";
import { CompilerError } from "./compiler/common/CompilerError";
import { ASTPrinter } from "./compiler/common/ASTPrinter";
import { CodeGenerator } from "./compiler/backend/CodeGenerator";
import { Compiler } from "./compiler/index";
import { PackageManager } from "./compiler/middleend/PackageManager";
import * as fs from "fs";
import { Command } from "commander";
import { spawnSync } from "child_process";

const program = new Command();

const packageJson = require("./package.json");

program
  .name("bpl")
  .description(packageJson.description ?? "BPL3 Compiler")
  .version(packageJson.version);

program
  .argument("<file>", "source file to compile")
  .option("-o, --output <file>", "output file path")
  .option("--emit <type>", "emit type: llvm, ast, tokens", "llvm")
  .option("--run", "run the generated code")
  .option("-v, --verbose", "enable verbose output")
  .option("--cache", "enable incremental compilation with module caching")
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
        // Use the new Compiler API with module resolution/caching
        const compiler = new Compiler({
          filePath,
          outputPath: options.output,
          emitType: options.emit,
          verbose: options.verbose,
          resolveImports: !options.cache, // Use module resolution if not caching
          useCache: options.cache, // Use caching if enabled
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

        // For cached compilation, the executable is already created
        if (options.cache) {
          if (result.output) {
            console.log(result.output);
          }

          if (options.run) {
            const execPath =
              options.output || filePath.replace(/\.[^/.]+$/, "");
            const runResult = spawnSync(execPath, [], {
              stdio: "inherit",
            });

            if (runResult.status !== 0) {
              process.exit(runResult.status ?? 1);
            }
          }
          return;
        }

        if (result.output) {
          const outputPath =
            options.output || filePath.replace(/\.[^/.]+$/, "") + ".ll";
          fs.writeFileSync(outputPath, result.output);

          if (options.verbose || (!options.run && options.emit === "llvm")) {
            console.log(`LLVM IR written to ${outputPath}`);
          }

          // Run if requested
          if (options.run) {
            // Compile LLVM IR to executable using clang
            const execPath = outputPath.replace(/\.ll$/, "");

            if (options.verbose) {
              console.log("Compiling LLVM IR to executable with clang...");
            }

            const compileResult = spawnSync(
              "clang",
              ["-Wno-override-module", outputPath, "-o", execPath],
              {
                stdio: options.verbose ? "inherit" : "pipe",
              },
            );

            if (compileResult.status !== 0) {
              console.error("Failed to compile LLVM IR with clang");
              if (!options.verbose && compileResult.stderr) {
                console.error(compileResult.stderr.toString());
              }
              process.exit(compileResult.status ?? 1);
            }

            if (options.verbose) {
              console.log(`Running executable: ${execPath}`);
            }

            const runResult = spawnSync(execPath, [], {
              stdio: "inherit",
            });

            // Clean up executable
            try {
              fs.unlinkSync(execPath);
            } catch (e) {
              // Ignore cleanup errors
            }

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

      const outputPath =
        options.output || filePath.replace(/\.[^/.]+$/, "") + ".ll";
      fs.writeFileSync(outputPath, ir);

      if (options.verbose || (!options.run && options.emit === "llvm")) {
        console.log(`LLVM IR written to ${outputPath}`);
      }

      // 5. Run
      if (options.run) {
        // Compile LLVM IR to executable using clang
        const execPath = outputPath.replace(/\.ll$/, "");

        if (options.verbose) {
          console.log("---------------------------------------------");
          console.log(`Compiling LLVM IR to executable with clang...`);
          console.log("---------------------------------------------");
        }

        const compileResult = spawnSync(
          "clang",
          ["-Wno-override-module", outputPath, "-o", execPath],
          {
            stdio: options.verbose ? "inherit" : "pipe",
          },
        );

        if (compileResult.status !== 0) {
          console.error("Failed to compile LLVM IR with clang");
          if (!options.verbose && compileResult.stderr) {
            console.error(compileResult.stderr.toString());
          }
          process.exit(compileResult.status ?? 1);
        }

        if (options.verbose) {
          console.log("---------------------------------------------");
          console.log(`Running executable: ${execPath}`);
          console.log("---------------------------------------------");
        }

        const result = spawnSync(execPath, [], { stdio: "inherit" });

        // Clean up executable
        try {
          fs.unlinkSync(execPath);
        } catch (e) {
          // Ignore cleanup errors
        }

        if (result.status !== 0) {
          if (options.verbose) {
            console.log("---------------------------------------------");
            console.error(`Program exited with code ${result.status}`);
            console.log("---------------------------------------------");
          } else {
          }
          process.exit(result.status ?? 1);
        } else if (options.verbose) {
          console.log("---------------------------------------------");
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

// Package management commands
program
  .command("pack [dir]")
  .description("Create a distributable package from a BPL project")
  .option("-o, --output <dir>", "output directory for the package")
  .action((dir, options) => {
    try {
      const packageDir = dir || process.cwd();
      const pm = new PackageManager();
      const tarball = pm.pack(packageDir, options.output);
      console.log(`\nPackage ready: ${tarball}`);
    } catch (e) {
      console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(1);
    }
  });

program
  .command("install [package]")
  .description("Install a BPL package")
  .option("-g, --global", "install package globally")
  .option("-v, --verbose", "verbose output")
  .action((pkg, options) => {
    try {
      const pm = new PackageManager();

      if (!pkg) {
        // Install dependencies from bpl.json in current directory
        if (!fs.existsSync("bpl.json")) {
          console.error("No bpl.json found in current directory");
          process.exit(1);
        }

        const manifest = pm.loadManifest(process.cwd());
        const deps = { ...manifest.dependencies, ...manifest.devDependencies };

        if (Object.keys(deps).length === 0) {
          console.log("No dependencies to install");
          return;
        }

        console.log(`Installing ${Object.keys(deps).length} dependencies...`);
        for (const [name, version] of Object.entries(deps)) {
          pm.install(`${name}-${version}.tgz`, options);
        }
      } else {
        pm.install(pkg, options);
      }
    } catch (e) {
      console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(1);
    }
  });

program
  .command("list")
  .description("List installed packages")
  .option("-g, --global", "list global packages")
  .action((options) => {
    try {
      const pm = new PackageManager();
      const packages = pm.list(options);

      if (packages.length === 0) {
        console.log("No packages installed");
        return;
      }

      console.log(
        `\nInstalled packages (${options.global ? "global" : "local"}):\n`,
      );
      for (const pkg of packages) {
        console.log(`  ${pkg.manifest.name}@${pkg.manifest.version}`);
        if (pkg.manifest.description) {
          console.log(`    ${pkg.manifest.description}`);
        }
      }
      console.log();
    } catch (e) {
      console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(1);
    }
  });

program
  .command("uninstall <package>")
  .alias("remove")
  .description("Uninstall a BPL package")
  .option("-g, --global", "uninstall global package")
  .action((packageName, options) => {
    try {
      const pm = new PackageManager();
      pm.uninstall(packageName, options);
    } catch (e) {
      console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(1);
    }
  });

program
  .command("init")
  .description("Initialize a new BPL package")
  .action(() => {
    try {
      const manifestPath = "bpl.json";

      if (fs.existsSync(manifestPath)) {
        console.error("bpl.json already exists");
        process.exit(1);
      }

      const cwd = process.cwd();
      const name = require("path").basename(cwd);

      const manifest = {
        name: name.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        version: "1.0.0",
        description: "A BPL package",
        main: "index.bpl",
        license: "MIT",
      };

      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
      console.log("Created bpl.json");
    } catch (e) {
      console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(1);
    }
  });

program.parse();
