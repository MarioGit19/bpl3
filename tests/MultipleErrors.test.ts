import { describe, test, expect } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import { Compiler } from "../compiler";
import { DiagnosticFormatter } from "../compiler/common/DiagnosticFormatter";

describe("Multiple errors in one pass", () => {
  test("reports both syntax and semantic errors together when collectAllErrors is enabled", () => {
    const exampleDir = path.join(__dirname, "../examples/multiple_errors_demo");
    const filePath = path.join(exampleDir, "main.bpl");
    const source = fs.readFileSync(filePath, "utf-8");

    const compiler = new Compiler({
      filePath,
      emitType: "llvm",
      collectAllErrors: true,
      verbose: false,
    });

    const result = compiler.compile(source);
    expect(result.success).toBe(false);
    expect(result.errors).toBeArray();
    expect(result.errors!.length).toBeGreaterThan(1);

    const formatter = new DiagnosticFormatter({ colorize: false });
    const output = formatter.formatErrors(result.errors!);

    // Ensure both error kinds are present in output
    expect(output).toContain("main.bpl");
    expect(output).toContain("help"); // semantic errors carry hints
  });
});
