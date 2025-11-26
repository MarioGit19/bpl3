import AsmGenerator from "./transpiler/AsmGenerator";
import Scope from "./transpiler/Scope";
import * as util from "./util";
import { execSync, spawnSync } from "child_process";
import { existsSync, unlinkSync } from "fs";

// --- Configuration Defaults ---
let linkMode: "dynamic" | "static" = "dynamic";
let quiet = false;
let printAsm = false;
let shouldRun = false;
let shouldGdb = false;
let compileLib = false;
let cleanupAsm = true;
let cleanupO = true;

function debug(...args: any[]) {
  if (quiet) return;
  console.log(...args);
}

// --- Parse Command Line Arguments ---
const args = process.argv.slice(2);
let sourceFile: string | null = null;
const extraLibs: string[] = [];

for (const arg of args) {
  if (arg.startsWith("-")) {
    switch (arg) {
      case "-s":
      case "--static":
        linkMode = "static";
        break;
      case "-d":
      case "--dynamic":
        linkMode = "dynamic";
        break;
      case "-q":
      case "--quiet":
        quiet = true;
        break;
      case "-p":
      case "--print-asm":
        printAsm = true;
        cleanupAsm = false;
        break;
      case "-r":
      case "--run":
        shouldRun = true;
        break;
      case "-g":
      case "--gdb":
        shouldGdb = true;
        break;
      case "-l":
      case "--lib":
        compileLib = true;
        cleanupO = false;
        break;
      default:
        console.warn(`Warning: Unknown option (ignored): ${arg}`);
        break;
    }
  } else {
    if (!sourceFile) {
      sourceFile = arg;
    } else {
      extraLibs.push(arg);
    }
  }
}

if (!sourceFile) {
  console.error("Error: No source file provided.");
  console.error(
    "Usage: bun index.ts [-s|-d] [-q] [-p] [-r] [-g] [-l] <source.x> [lib1.o ...]",
  );
  process.exit(1);
}

const fileName = sourceFile;

// --- 1. Transpile ---
debug(`--- 1. Transpiling ${fileName} ---`);

const tokens = util.getFileTokens(fileName);
const ast = util.parseTokens(tokens);

const gen = new AsmGenerator();
const scope = new Scope();
const objectsToLink: Set<string> = new Set(extraLibs);

const imports = util.parseImportExpressions(util.extractImportStatements(ast));
if (imports.length) {
  // We rely on parseLibraryFile to handle recursive compilation and return object files
  const objectFiles = util.parseLibraryFile(fileName, scope);
  objectFiles.forEach((obj) => objectsToLink.add(obj));
}

const asmContent = util.transpileProgram(ast, gen, scope);
const asmFilePath = util.getOutputFileName(fileName, ".asm");
util.saveToFile(asmFilePath, asmContent);

// --- 2. Print Assembly ---
if (printAsm) {
  debug(`--- 2. Generated Assembly: ${asmFilePath} ---`);
  console.log(asmContent);
  debug("-----------------------------------");
} else {
  debug("--- 2. Skipping assembly printout ---");
}

// --- 3. Assemble ---
debug(`--- 3. Assembling ${asmFilePath} ---`);
let objFilePath: string;
try {
  objFilePath = util.compileAsmFile(asmFilePath);
} catch (e) {
  console.error("Assembly failed.");
  process.exit(1);
}

// --- 4. Link ---
if (compileLib) {
  debug("--- 4. Skipping linking (Library Mode) ---");
  if (cleanupAsm && existsSync(asmFilePath)) unlinkSync(asmFilePath);
  process.exit(0);
}

debug(`--- 4. Linking to create executable (Mode: ${linkMode}) ---`);

const outputExe = util.getOutputFileName(fileName, "");
const linkArgs = Array.from(objectsToLink);
if (linkMode === "static") {
  linkArgs.push("-static");
}

try {
  util.linkObjectFile(objFilePath, linkArgs, outputExe);
} catch (e) {
  console.error("Linking failed.");
  process.exit(1);
}

// --- 5. Cleanup ---
if (cleanupAsm && existsSync(asmFilePath)) {
  debug("--- Cleaning up assembly file ---");
  unlinkSync(asmFilePath);
}
if (cleanupO && existsSync(objFilePath)) {
  debug("--- Cleaning up object file ---");
  unlinkSync(objFilePath);
}

// --- 6. Run ---
if (shouldRun || shouldGdb) {
  debug(`--- 5. Running ${outputExe} ---`);

  if (shouldGdb) {
    spawnSync("gdb", ["-q", `./${outputExe}`], { stdio: "inherit" });
  } else {
    debug("-----------------------------------");
    try {
      execSync(`./${outputExe}`, { stdio: "inherit" });
      debug("-----------------------------------");
      debug(`Program exited with code: 0`);
    } catch (e: any) {
      debug("-----------------------------------");
      debug(`Program exited with code: ${e.status}`);
    }
  }
}
