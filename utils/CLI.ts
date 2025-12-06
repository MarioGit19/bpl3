import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { Logger } from "./Logger";

export interface CompilerConfig {
  linkMode: "dynamic" | "static";
  quiet: boolean;
  printAsm: boolean;
  printAst: boolean;
  shouldRun: boolean;
  shouldGdb: boolean;
  compileLib: boolean;
  cleanupAsm: boolean;
  cleanupO: boolean;
  optimizationLevel: number;
  showDeps: boolean;
  extraLibs: string[];
  sourceFile: string | null;
  sourceCode: string | null;
  isEval: boolean;
}

export const defaultConfig: CompilerConfig = {
  linkMode: "dynamic",
  quiet: false,
  printAsm: false,
  printAst: false,
  shouldRun: false,
  shouldGdb: false,
  compileLib: false,
  cleanupAsm: true,
  cleanupO: true,
  optimizationLevel: 3,
  showDeps: false,
  extraLibs: [],
  sourceFile: null,
  sourceCode: null,
  isEval: false,
};

export function parseCLI(): CompilerConfig {
  const config: CompilerConfig = { ...defaultConfig };

  // --- Load Configuration File ---
  const configPath = resolve("transpiler.config.json");
  if (existsSync(configPath)) {
    try {
      const fileConfig = JSON.parse(readFileSync(configPath, "utf-8"));
      if (fileConfig.linkMode) config.linkMode = fileConfig.linkMode;
      if (fileConfig.quiet !== undefined) {
        config.quiet = fileConfig.quiet;
        Logger.setQuiet(config.quiet);
      }
      if (fileConfig.printAsm !== undefined)
        config.printAsm = fileConfig.printAsm;
      if (fileConfig.shouldRun !== undefined)
        config.shouldRun = fileConfig.shouldRun;
      if (fileConfig.shouldGdb !== undefined)
        config.shouldGdb = fileConfig.shouldGdb;
      if (fileConfig.compileLib !== undefined)
        config.compileLib = fileConfig.compileLib;
      if (fileConfig.cleanupAsm !== undefined)
        config.cleanupAsm = fileConfig.cleanupAsm;
      if (fileConfig.cleanupO !== undefined)
        config.cleanupO = fileConfig.cleanupO;
      if (fileConfig.optimizationLevel !== undefined)
        config.optimizationLevel = fileConfig.optimizationLevel;
      if (fileConfig.extraLibs && Array.isArray(fileConfig.extraLibs)) {
        config.extraLibs.push(...fileConfig.extraLibs);
      }
    } catch (e) {
      Logger.warn("Warning: Failed to parse transpiler.config.json");
    }
  }

  // --- Parse Command Line Arguments ---
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg.startsWith("-")) {
      switch (arg) {
        case "-e":
        case "--eval":
          if (i + 1 < args.length) {
            config.isEval = true;
            config.sourceCode = args[++i]!;
            config.sourceFile = `eval_${Date.now()}_${Math.floor(Math.random() * 10000)}.x`;
            writeFileSync(config.sourceFile, config.sourceCode);
          } else {
            Logger.error("Error: No code provided for -e");
            process.exit(1);
          }
          break;
        case "-s":
        case "--static":
          config.linkMode = "static";
          break;
        case "-d":
        case "--dynamic":
          config.linkMode = "dynamic";
          break;
        case "-q":
        case "--quiet":
          config.quiet = true;
          Logger.setQuiet(true);
          break;
        case "-p":
        case "--print-asm":
          config.printAsm = true;
          config.cleanupAsm = false;
          break;
        case "--print-ast":
          config.printAst = true;
          break;
        case "-r":
        case "--run":
          config.shouldRun = true;
          break;
        case "-g":
        case "--gdb":
          config.shouldGdb = true;
          break;
        case "-l":
        case "--lib":
          config.compileLib = true;
          config.cleanupO = false;
          break;
        case "-O0":
          config.optimizationLevel = 0;
          break;
        case "-O1":
          config.optimizationLevel = 1;
          break;
        case "-O2":
          config.optimizationLevel = 2;
          break;
        case "-O3":
          config.optimizationLevel = 3;
          break;
        case "--deps":
        case "--graph":
          config.showDeps = true;
          break;
        default:
          Logger.warn(`Warning: Unknown option (ignored): ${arg}`);
          break;
      }
    } else {
      if (!config.sourceFile && !config.isEval) {
        config.sourceFile = arg!;
      } else {
        config.extraLibs.push(arg!);
      }
    }
  }

  if (!config.sourceFile) {
    Logger.error("Error: No source file provided.");
    Logger.error(
      "Usage: bun index.ts [-s|-d] [-q] [-p] [-r] [-g] [-l] <source.x> [lib1.o ...]",
    );
    process.exit(1);
  }

  return config;
}
