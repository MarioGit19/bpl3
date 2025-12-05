import { resolve, dirname } from "path";
import Scope from "./transpiler/Scope";
import HelperGenerator from "./transpiler/HelperGenerator";
import { parseLibraryFile } from "./utils/transpiler";
import { parseFile, extractImportStatements, parseImportExpressions } from "./utils/parser";

const fileName = "/tmp/test_string_import.x";
const ast = parseFile(fileName);
const scope = new Scope();

HelperGenerator.generateBaseTypes(scope);

const imports = parseImportExpressions(extractImportStatements(ast));
if (imports.length) {
  const objectFiles = parseLibraryFile(fileName, scope);
  console.log("Object files:", objectFiles);
}

console.log("\n=== Functions in scope ===");
for (const [name, info] of scope.functions.entries()) {
  if (info.receiverStruct === "String") {
    console.log(`  ${name}: isMethod=${info.isMethod}, receiverStruct=${info.receiverStruct}, isExternal=${info.isExternal}`);
  }
}

console.log("\n=== String type info ===");
const stringType = scope.resolveType("String");
if (stringType) {
  console.log("  Found String type");
  console.log("  genericMethods:", stringType.genericMethods?.length || 0);
} else {
  console.log("  String type not found!");
}
