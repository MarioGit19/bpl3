import { dirname, resolve, relative, basename } from "path";
import { existsSync } from "fs";

import { ErrorReporter, CompilerError } from "../errors";
import { MemorySafetyAnalyzer } from "../transpiler/analysis/MemorySafetyAnalyzer";
import { SemanticAnalyzer } from "../transpiler/analysis/SemanticAnalyzer";
import HelperGenerator from "../transpiler/HelperGenerator";
import { IRGenerator } from "../transpiler/ir/IRGenerator";
import Scope from "../transpiler/Scope";
import { LLVMTargetBuilder } from "../transpiler/target/LLVMTargetBuilder";
import { compileLlvmIrToObject } from "./compiler";
import { saveToFile } from "./file";
import {
  extractExportStatements,
  extractImportStatements,
  parseFile,
} from "./parser";

import type ProgramExpr from "../parser/expression/programExpr";
import type ExportExpr from "../parser/expression/exportExpr";
export function transpileProgram(
  program: ProgramExpr,
  scope?: Scope,
  enableStackTrace: boolean = false,
): string {
  if (!scope) {
    scope = new Scope();
  }

  if (!scope.resolveType("u8")) {
    HelperGenerator.generateBaseTypes(scope);
  }

  const analyzer = new SemanticAnalyzer();
  analyzer.analyze(program, scope, true);

  for (const warning of analyzer.warnings) {
    ErrorReporter.warn(warning);
  }

  // Run memory safety analysis
  const memorySafety = new MemorySafetyAnalyzer();
  memorySafety.analyze(program, scope);

  for (const error of memorySafety.errors) {
    ErrorReporter.report(error);
  }

  for (const warning of memorySafety.warnings) {
    ErrorReporter.warn(warning);
  }

  // Halt compilation if memory safety errors were found
  if (memorySafety.errors.length > 0) {
    throw new Error(
      `Compilation failed due to ${memorySafety.errors.length} memory safety error(s)`,
    );
  }

  program.optimize();

  const gen = new IRGenerator(enableStackTrace);
  program.toIR(gen, scope);

  const builder = new LLVMTargetBuilder(enableStackTrace);
  return builder.build(gen.module);
}

export function parseLibraryFile(
  libFilePath: string,
  scope: Scope,
  enableStackTrace: boolean = false,
  visited: Set<string> = new Set(),
  moduleCache: Map<string, Scope> = new Map(),
  entryDir?: string,
): string[] {
  const absoluteLibPath = resolve(libFilePath);
  if (visited.has(absoluteLibPath)) {
    return [];
  }
  visited.add(absoluteLibPath);

  if (!entryDir) {
    entryDir = dirname(absoluteLibPath);
  }

  const program = parseFile(libFilePath) as ProgramExpr;
  const imports = extractImportStatements(program);
  const objectFiles: string[] = [];

  for (const importExpr of imports) {
    let moduleName = importExpr.moduleName;
    let absolutePath = "";

    if (moduleName === "std") {
      absolutePath = resolve(__dirname, "../lib/std.x");
    } else if (moduleName.startsWith("std/")) {
      let relativePath = moduleName.substring(4);
      if (!relativePath.endsWith(".x")) {
        relativePath += ".x";
      }
      absolutePath = resolve(__dirname, "../lib", relativePath);
    } else if (
      moduleName.startsWith(".") ||
      moduleName.startsWith("/") ||
      moduleName.includes("/")
    ) {
      const libDir = dirname(resolve(libFilePath));
      absolutePath = resolve(libDir, moduleName);
    } else {
      // Try to resolve from lib directory
      let libPath = resolve(__dirname, "../lib", moduleName);
      if (!libPath.endsWith(".x")) {
        libPath += ".x";
      }
      if (existsSync(libPath)) {
        absolutePath = libPath;
      } else {
        continue;
      }
    }

    if (absolutePath.endsWith(".x")) {
      let importedScope: Scope;
      let shouldTranspile = true;

      if (moduleCache.has(absolutePath)) {
        importedScope = moduleCache.get(absolutePath)!;
        shouldTranspile = false;
      } else {
        importedScope = new Scope();
        moduleCache.set(absolutePath, importedScope);
      }

      try {
        if (shouldTranspile) {
          const nestedLibs = parseLibraryFile(
            absolutePath,
            importedScope,
            enableStackTrace,
            visited,
            moduleCache,
            entryDir,
          );
          objectFiles.push(...nestedLibs);

          let displayPath = relative(entryDir!, absolutePath);
          if (!displayPath.startsWith(".") && !displayPath.startsWith("/")) {
            displayPath = "./" + displayPath;
          }

          const importedProgram = parseFile(absolutePath, displayPath);

          const asmContent = transpileProgram(
            importedProgram,
            importedScope,
            enableStackTrace,
          );

          const asmFile = absolutePath.replace(/\.x$/, ".ll");
          saveToFile(asmFile, asmContent);
          const objFile = compileLlvmIrToObject(asmFile);
          objectFiles.push(objFile);
        }

        const importedProgram = parseFile(absolutePath);
        const importedExports = extractExportStatements(
          importedProgram,
        ) as ExportExpr[];

        for (const imp of importExpr.importName) {
          const match = importedExports.find(
            (e) => e.exportName === imp.name && e.exportType === imp.type,
          );
          if (!match) {
            throw new CompilerError(
              `Import ${imp.name} (${imp.type}) not found in ${absolutePath}`,
              imp.token?.line || importExpr.startToken?.line || 0,
            );
          }
        }
      } catch (e: any) {
        if (e instanceof CompilerError) throw e;
        if (
          e.message &&
          (e.message.startsWith("File not found") ||
            e.message.startsWith("Directory does not exist"))
        ) {
          throw new CompilerError(
            `Could not resolve module '${moduleName}'`,
            importExpr.startToken?.line || 0,
          );
        }
        throw e;
      }

      for (const imp of importExpr.importName) {
        if (imp.type === "type") {
          const typeInfo = importedScope.resolveType(imp.name);
          if (typeInfo) {
            // Store the defining scope for generic types so their methods
            // can be instantiated in the correct context with access to imports
            const typeInfoWithScope = {
              ...typeInfo,
              definingScope: importedScope,
            };
            scope.defineType(imp.name, typeInfoWithScope);

            // Auto-import methods for the struct
            for (const [funcName, funcInfo] of importedScope.functions) {
              if (funcInfo.isMethod && funcInfo.receiverStruct === imp.name) {
                scope.defineFunction(funcName, {
                  ...funcInfo,
                  label: funcInfo.name,
                  startLabel: funcInfo.name,
                  endLabel: funcInfo.name,
                  isExternal: true,
                  llvmName: `@${funcInfo.name}`,
                  definitionScope: importedScope,
                });
              }
            }
          } else {
            throw new CompilerError(
              `Imported type ${imp.name} not found in ${absolutePath}`,
              imp.token?.line || importExpr.startToken?.line || 0,
            );
          }
        }
      }

      for (const imp of importExpr.importName) {
        if (imp.type === "function") {
          const funcInfo = importedScope.resolveFunction(imp.name);
          if (funcInfo) {
            scope.defineFunction(imp.name, {
              ...funcInfo,
              label: funcInfo.name,
              startLabel: funcInfo.name,
              endLabel: funcInfo.name,
              isExternal: true,
              llvmName: `@${funcInfo.name}`,
            });
          } else {
            throw new CompilerError(
              `Imported function ${imp.name} not found in ${absolutePath}`,
              imp.token?.line || importExpr.startToken?.line || 0,
            );
          }
        }
      }
    } else {
      objectFiles.push(absolutePath);
      // ... handle object file imports ...
    }
  }
  return objectFiles;
}
