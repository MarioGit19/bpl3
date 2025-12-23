import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { Compiler } from "../compiler";
import { CompilerError } from "../compiler/common/CompilerError";
import { DiagnosticFormatter } from "../compiler/common/DiagnosticFormatter";

/**
 * Error Formatting Demo Test Suite
 *
 * This test suite demonstrates how various compiler errors are formatted
 * with proper location information, code snippets, and helpful hints.
 */
describe("Error Formatting Demo", () => {
  let tempDir: string;
  const formatter = new DiagnosticFormatter({
    colorize: false,
    contextLines: 2,
    showCodeSnippets: true,
  });

  // Helper to create temporary test file
  function createTestFile(name: string, content: string): string {
    const filePath = path.join(tempDir, name);
    fs.writeFileSync(filePath, content, "utf-8");
    return filePath;
  }

  // Helper to compile and capture errors
  function compileAndShowErrors(
    filePath: string,
    content: string,
  ): CompilerError[] {
    try {
      const compiler = new Compiler({
        filePath,
        outputPath: path.join(tempDir, "output.ll"),
        emitType: "llvm",
      });

      const result = compiler.compile(content);

      if (!result.success && result.errors) {
        return result.errors;
      }
    } catch (e) {
      if (e instanceof CompilerError) {
        return [e];
      }
    }

    return [];
  }

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bpl-error-demo-"));
    console.log(`\n📁 Created temporary directory: ${tempDir}\n`);
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  test("ERROR: Unknown/unexpected token", () => {
    const code = `frame main() {
  local x: int = 10$$$;
}`;

    const filePath = createTestFile("unknown_token.bpl", code);
    const errors = compileAndShowErrors(filePath, code);

    console.log("\n🔴 ERROR: Unknown Token");
    console.log("━".repeat(70));

    if (errors.length > 0) {
      const formatted = formatter.formatErrors(errors);
      console.log(formatted);

      // Verify error has location info
      expect(errors[0]!.location.file).toContain("unknown_token.bpl");
      expect(errors[0]!.location.startLine).toBeGreaterThan(0);
      expect(errors[0]!.location.startColumn).toBeGreaterThan(0);
      expect(formatted).toContain("unknown_token.bpl");
    }

    console.log("━".repeat(70) + "\n");
  });

  test("ERROR: Missing semicolon", () => {
    const code = `frame main() {
  local x: int = 10
  local y: int = 20;
  println(x);
}`;

    const filePath = createTestFile("missing_semicolon.bpl", code);
    const errors = compileAndShowErrors(filePath, code);

    console.log("\n🔴 ERROR: Missing Semicolon");
    console.log("━".repeat(70));

    if (errors.length > 0) {
      const formatted = formatter.formatErrors(errors);
      console.log(formatted);

      expect(formatted).toContain("missing_semicolon.bpl");
      expect(formatted).toContain("error");
    }

    console.log("━".repeat(70) + "\n");
  });

  test("ERROR: Type mismatch", () => {
    const code = `frame add(a: i32, b: i32) ret i32 {
  return a + b;
}

frame main() {
  local x: i32 = 10;
  local y: f64 = 3.14;
  local result: i32 = add(x, y);
  println(result);
}`;

    const filePath = createTestFile("type_mismatch.bpl", code);
    const errors = compileAndShowErrors(filePath, code);

    console.log("\n🔴 ERROR: Type Mismatch");
    console.log("━".repeat(70));

    if (errors.length > 0) {
      const formatted = formatter.formatErrors(errors);
      console.log(formatted);

      expect(formatted).toContain("type_mismatch.bpl");
      expect(formatted).toContain("error");
    }

    console.log("━".repeat(70) + "\n");
  });

  test("ERROR: Undefined variable", () => {
    const code = `frame main() {
  local x: int = 10;
  local y: int = z + 5;
  println(x + y);
}`;

    const filePath = createTestFile("undefined_var.bpl", code);
    const errors = compileAndShowErrors(filePath, code);

    console.log("\n🔴 ERROR: Undefined Variable");
    console.log("━".repeat(70));

    if (errors.length > 0) {
      const formatted = formatter.formatErrors(errors);
      console.log(formatted);

      expect(formatted).toContain("undefined_var.bpl");
      expect(formatted).toContain("error");
    }

    console.log("━".repeat(70) + "\n");
  });

  test("ERROR: Invalid struct member access", () => {
    const code = `struct Person {
  name: string,
  age: i32,
}

frame main() {
  local p: Person = Person { name: "Alice", age: 30 };
  println(p.nonexistent);
}`;

    const filePath = createTestFile("invalid_member.bpl", code);
    const errors = compileAndShowErrors(filePath, code);

    console.log("\n🔴 ERROR: Invalid Struct Member");
    console.log("━".repeat(70));

    if (errors.length > 0) {
      const formatted = formatter.formatErrors(errors);
      console.log(formatted);

      expect(formatted).toContain("invalid_member.bpl");
      expect(formatted).toContain("error");
    }

    console.log("━".repeat(70) + "\n");
  });

  test("ERROR: Function argument count mismatch", () => {
    const code = `frame greet(name: string, age: i32) ret void {
  println("Hello, " + name);
}

frame main() {
  greet("Alice");
  greet("Bob", 25, "extra");
}`;

    const filePath = createTestFile("arg_mismatch.bpl", code);
    const errors = compileAndShowErrors(filePath, code);

    console.log("\n🔴 ERROR: Function Argument Mismatch");
    console.log("━".repeat(70));

    if (errors.length > 0) {
      const formatted = formatter.formatErrors(errors);
      console.log(formatted);

      expect(formatted).toContain("arg_mismatch.bpl");
      expect(formatted).toContain("error");
    }

    console.log("━".repeat(70) + "\n");
  });

  test("ERROR: Invalid array access", () => {
    const code = `frame main() {
  local arr: i32[5] = [1, 2, 3, 4, 5];
  local x: string = arr[0];
  println(x);
}`;

    const filePath = createTestFile("array_type_error.bpl", code);
    const errors = compileAndShowErrors(filePath, code);

    console.log("\n🔴 ERROR: Invalid Array Access Type");
    console.log("━".repeat(70));

    if (errors.length > 0) {
      const formatted = formatter.formatErrors(errors);
      console.log(formatted);

      expect(formatted).toContain("array_type_error.bpl");
      expect(formatted).toContain("error");
    }

    console.log("━".repeat(70) + "\n");
  });

  test("ERROR: Duplicate declarations", () => {
    const code = `frame main() {
  local x: int = 10;
  local x: int = 20;
  println(x);
}`;

    const filePath = createTestFile("duplicate_decl.bpl", code);
    const errors = compileAndShowErrors(filePath, code);

    console.log("\n🔴 ERROR: Duplicate Declaration");
    console.log("━".repeat(70));

    if (errors.length > 0) {
      const formatted = formatter.formatErrors(errors);
      console.log(formatted);

      expect(formatted).toContain("duplicate_decl.bpl");
      expect(formatted).toContain("error");
    }

    console.log("━".repeat(70) + "\n");
  });

  test("ERROR: Invalid return type", () => {
    const code = `frame getValue() ret i32 {
  return "not a number";
}

frame main() {
  local x: i32 = getValue();
  println(x);
}`;

    const filePath = createTestFile("invalid_return.bpl", code);
    const errors = compileAndShowErrors(filePath, code);

    console.log("\n🔴 ERROR: Invalid Return Type");
    console.log("━".repeat(70));

    if (errors.length > 0) {
      const formatted = formatter.formatErrors(errors);
      console.log(formatted);

      expect(formatted).toContain("invalid_return.bpl");
      expect(formatted).toContain("error");
    }

    console.log("━".repeat(70) + "\n");
  });

  test("ERROR: Missing closing brace", () => {
    const code = `frame main() {
  local x: int = 10;
  println(x);`;

    const filePath = createTestFile("missing_brace.bpl", code);
    const errors = compileAndShowErrors(filePath, code);

    console.log("\n🔴 ERROR: Missing Closing Brace");
    console.log("━".repeat(70));

    if (errors.length > 0) {
      const formatted = formatter.formatErrors(errors);
      console.log(formatted);

      expect(formatted).toContain("missing_brace.bpl");
    }

    console.log("━".repeat(70) + "\n");
  });

  test("DEMO: Error with context lines and proper formatting", () => {
    const code = `frame calculate(a: i32, b: i32) ret i32 {
  // Line 2: comment
  local sum: i32 = a + b;
  local diff: i32 = a - b;
  local product: i32 = a * b_undefined;  // ERROR: undefined variable
  local quotient: i32 = a / b;
  return sum;
}

frame main() {
  local result: i32 = calculate(10, 5);
  println(result);
}`;

    const filePath = createTestFile("demo_error.bpl", code);
    const errors = compileAndShowErrors(filePath, code);

    console.log("\n🟡 DEMO: Error with Full Context");
    console.log("━".repeat(70));

    if (errors.length > 0) {
      const formatted = formatter.formatErrors(errors);
      console.log(formatted);

      // Verify comprehensive formatting
      expect(formatted).toContain("demo_error.bpl");
      expect(formatted).toContain("error");
    }

    console.log("━".repeat(70) + "\n");
  });

  test("🟠 DEMO: Multiple related errors with hint messages", () => {
    const code = `frame process() ret void {
  local x: int = 10;
  local y: int = x + undefined1;
  local z: int = y + undefined2;
  println(z);
}

frame main() {
  process();
}`;

    const filePath = createTestFile("multi_errors.bpl", code);
    const errors = compileAndShowErrors(filePath, code);

    console.log("\n🟠 DEMO: Multiple Related Errors");
    console.log("━".repeat(70));

    if (errors.length > 0) {
      const formatted = formatter.formatErrors(errors);
      console.log(formatted);

      // Should show all errors
      expect(formatted).toContain("error");
      expect(formatted).toContain("multi_errors.bpl");
    }

    console.log("━".repeat(70) + "\n");
  });

  test("DEMO: Error with hint and suggestion", () => {
    const code = `frame main() {
  local x: i32 = 42;
  local y: string = x;  // Type mismatch - trying to assign i32 to string
  println(y);
}`;

    const filePath = createTestFile("error_with_hint.bpl", code);
    const errors = compileAndShowErrors(filePath, code);

    console.log("\n💡 DEMO: Error with Hint/Suggestion");
    console.log("━".repeat(70));

    if (errors.length > 0) {
      // Create error with hint
      const error = errors[0]!;
      error.hint =
        "Consider casting the value using 'cast<string>(x)' or using string conversion";

      const formatted = formatter.formatError(error);
      console.log(formatted);

      expect(formatted).toContain("help");
      expect(formatted).toContain("cast");
    }

    console.log("━".repeat(70) + "\n");
  });

  test("DEMO: Error with related locations (cross-reference)", () => {
    console.log("\n🔗 DEMO: Error with Related Locations");
    console.log("━".repeat(70));

    // Create a manual error with related location
    const mainFile = createTestFile(
      "main.bpl",
      `import  calc from "./lib";

frame main() {
  local result: i32 = calc(10, 20);
  println(result);
}`,
    );

    const error = new CompilerError(
      "Type mismatch in function call",
      "Expected type i32 but got f64",
      {
        file: mainFile,
        startLine: 4,
        startColumn: 18,
        endLine: 4,
        endColumn: 30,
      },
    );

    error.addRelatedLocation(
      {
        file: mainFile,
        startLine: 1,
        startColumn: 9,
        endLine: 1,
        endColumn: 24,
      },
      "Function imported from here",
    );

    const formatted = formatter.formatError(error);
    console.log(formatted);

    expect(formatted).toContain("Type mismatch");
    expect(formatted).toContain("related locations");

    console.log("━".repeat(70) + "\n");
  });

  test("DEMO: Comprehensive error summary report", () => {
    console.log("\n📋 DEMO: Comprehensive Error Report");
    console.log("━".repeat(70));

    const testFile = createTestFile(
      "comprehensive.bpl",
      `frame main() {
  local x: int = 10;
  local y: int = undefined_var;
  local z: i32 = "string";
  println(x + y + z);
}`,
    );

    const errors = compileAndShowErrors(
      testFile,
      `frame main() {
  local x: int = 10;
  local y: int = undefined_var;
  local z: i32 = "string";
  println(x + y + z);
}`,
    );

    if (errors.length > 0) {
      const formatted = formatter.formatErrors(errors);
      console.log(formatted);

      // Verify comprehensive output
      expect(formatted).toContain("comprehensive.bpl");
    }

    console.log("━".repeat(70) + "\n");
  });
});
