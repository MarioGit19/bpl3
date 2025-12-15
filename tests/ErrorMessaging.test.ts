import { describe, test, expect } from "bun:test";
import {
  CompilerError,
  DiagnosticSeverity,
} from "../compiler/common/CompilerError";
import { DiagnosticFormatter } from "../compiler/common/DiagnosticFormatter";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("Enhanced Error Messaging", () => {
  test("should format error with location information", () => {
    const error = new CompilerError(
      "Unexpected token",
      "Expected ';' at end of statement",
      {
        file: "/tmp/test.bpl",
        startLine: 5,
        startColumn: 10,
        endLine: 5,
        endColumn: 15,
      },
    );

    const formatted = error.toString();
    expect(formatted).toContain("test.bpl:5:10");
    expect(formatted).toContain("Unexpected token");
  });

  test("should format error with code snippet", () => {
    // Create temporary file with content
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bpl-error-test-"));
    const testFile = path.join(tempDir, "test.bpl");

    const content = `fn main() {
  let x = 10
  let y = 20;
  println(x + y);
}`;

    fs.writeFileSync(testFile, content, "utf-8");

    try {
      const error = new CompilerError(
        "Missing semicolon",
        "Add ';' to complete the statement",
        {
          file: testFile,
          startLine: 2,
          startColumn: 13,
          endLine: 2,
          endColumn: 13,
        },
      );

      const formatted = error.toString();
      expect(formatted).toContain("test.bpl:2:13");
      expect(formatted).toContain("Missing semicolon");
      expect(formatted).toContain("let x = 10");
    } finally {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  test("should format multiple errors with summary", () => {
    const formatter = new DiagnosticFormatter({
      colorize: false,
      contextLines: 2,
    });

    const error1 = new CompilerError("Type mismatch", "Expected i32, got f64", {
      file: "/tmp/test1.bpl",
      startLine: 10,
      startColumn: 5,
      endLine: 10,
      endColumn: 10,
    });

    const error2 = new CompilerError(
      "Undefined variable",
      "Variable 'undefined_var' is not defined",
      {
        file: "/tmp/test2.bpl",
        startLine: 15,
        startColumn: 2,
        endLine: 15,
        endColumn: 15,
      },
    );

    const formatted = formatter.formatErrors([error1, error2]);
    expect(formatted).toContain("Type mismatch");
    expect(formatted).toContain("Undefined variable");
    expect(formatted).toContain("2 errors");
  });

  test("should support severity levels", () => {
    const warning = new CompilerError(
      "Unused variable",
      "This variable is declared but never used",
      {
        file: "/tmp/test.bpl",
        startLine: 5,
        startColumn: 7,
        endLine: 5,
        endColumn: 12,
      },
    );

    warning.setSeverity(DiagnosticSeverity.Warning);
    const diagnostic = warning.toDiagnostic();

    expect(diagnostic.severity).toBe(DiagnosticSeverity.Warning);
    expect(diagnostic.message).toContain("Unused variable");
  });

  test("should support related locations", () => {
    const error = new CompilerError(
      "Conflicting declaration",
      "A function with this name already exists",
      {
        file: "/tmp/test.bpl",
        startLine: 10,
        startColumn: 4,
        endLine: 10,
        endColumn: 8,
      },
    );

    error.addRelatedLocation(
      {
        file: "/tmp/test.bpl",
        startLine: 5,
        startColumn: 4,
        endLine: 5,
        endColumn: 8,
      },
      "Previous declaration here",
    );

    const formatted = error.toString();
    expect(formatted).toContain("Conflicting declaration");
    expect(formatted).toContain("Previous declaration here");
  });

  test("should gracefully handle missing source files", () => {
    const error = new CompilerError(
      "File not found",
      "This source file could not be accessed",
      {
        file: "/nonexistent/file.bpl",
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: 10,
      },
    );

    const formatted = error.toString();
    expect(formatted).toContain("file.bpl:1:1");
    expect(formatted).toContain("File not found");
    // Should not crash, just show location without snippet
  });

  test("should support JSON output for IDE integration", () => {
    const formatter = new DiagnosticFormatter({
      colorize: false,
    });

    const error = new CompilerError("Syntax error", "Unexpected token", {
      file: "/tmp/test.bpl",
      startLine: 3,
      startColumn: 5,
      endLine: 3,
      endColumn: 10,
    });

    const jsonOutput = formatter.formatAsJSON([error]);
    const parsed = JSON.parse(jsonOutput);

    expect(parsed).toBeArray();
    expect(parsed[0].message).toBe("Syntax error");
    expect(parsed[0].location.start.line).toBe(3);
    expect(parsed[0].location.start.column).toBe(5);
  });

  test("should format errors without ANSI colors when requested", () => {
    const formatter = new DiagnosticFormatter({
      colorize: false,
      contextLines: 2,
    });

    const error = new CompilerError("Type error", "Type mismatch", {
      file: "/tmp/test.bpl",
      startLine: 5,
      startColumn: 10,
      endLine: 5,
      endColumn: 15,
    });

    const formatted = formatter.formatError(error);
    // Should not contain ANSI escape codes
    expect(formatted).not.toContain("\x1b[");
  });

  test("should show diagnostic severity in output", () => {
    const formatter = new DiagnosticFormatter({
      colorize: false,
    });

    const error = new CompilerError("Compilation error", "Critical issue", {
      file: "/tmp/test.bpl",
      startLine: 1,
      startColumn: 1,
      endLine: 1,
      endColumn: 5,
    });

    error.setSeverity(DiagnosticSeverity.Error);
    const formatted = formatter.formatError(error, DiagnosticSeverity.Error);

    expect(formatted).toContain("error");
    expect(formatted).toContain("Compilation error");
  });
});
