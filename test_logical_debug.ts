import { CodeGenerator } from "./compiler/backend/CodeGenerator";
import { lexWithGrammar } from "./compiler/frontend/GrammarLexer";
import { Parser } from "./compiler/frontend/Parser";
import { TypeChecker } from "./compiler/middleend/TypeChecker";

const source = `
  frame logic(a: bool, b: bool) ret bool {
    return a && b;
  }
`;

const tokens = lexWithGrammar(source, "test.bpl");
const parser = new Parser(source, "test.bpl", tokens);
const program = parser.parse();

// Type check
const typeChecker = new TypeChecker();
typeChecker.checkProgram(program);

// Check after type checking
const fn = program.statements[0] as any;
if (fn) {
  const body = fn.body;
  if (body && body.statements) {
    for (const stmt of body.statements) {
      if (stmt.kind === "Return") {
        console.log("Return statement (AFTER TYPE CHECK):");
        console.log("  stmt.value:", stmt.value ? "exists" : "undefined");
        console.log("  stmt.value.kind:", stmt.value?.kind);
        console.log(
          "  stmt.value.resolvedType:",
          stmt.value?.resolvedType
            ? JSON.stringify(stmt.value.resolvedType, null, 2)
            : "undefined",
        );
        if (stmt.value?.kind === "Binary") {
          console.log(
            "  left.resolvedType:",
            stmt.value.left?.resolvedType
              ? JSON.stringify(stmt.value.left.resolvedType, null, 2)
              : "undefined",
          );
          console.log(
            "  right.resolvedType:",
            stmt.value.right?.resolvedType
              ? JSON.stringify(stmt.value.right.resolvedType, null, 2)
              : "undefined",
          );
        }
      }
    }
  }
}
