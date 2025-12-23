import { describe, expect, it } from "bun:test";
import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const BPL_CLI = path.join(process.cwd(), "index.ts");

function runCLI(args: string[]) {
  return spawnSync("bun", [BPL_CLI, ...args], {
    encoding: "utf-8",
    env: { ...process.env, NO_COLOR: "1" }, // Disable color for easier assertion
  });
}

describe("CLI Tests", () => {
  it("should lint files and report errors", () => {
    const lintFile = path.join(process.cwd(), "examples/lint_test/main.bpl");
    const result = runCLI(["lint", lintFile]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Struct 'bad_struct_name' should be PascalCase",
    );
    expect(result.stderr).toContain(
      "Function 'BadFunctionName' should be camelCase",
    );
    expect(result.stderr).toContain("[L001]");
  });

  it("should report enhanced errors with codes", () => {
    const errorFile = path.join(process.cwd(), "examples/error_test/main.bpl");
    const result = runCLI([errorFile]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("error[E001]");
    expect(result.stderr).toContain("Type mismatch");
    expect(result.stderr).toContain("cannot assign *i8 to i32");
  });

  it("should compile with --dwarf flag and generate debug metadata", () => {
    const dwarfFile = path.join(process.cwd(), "examples/dwarf_test/main.bpl");
    // We use --emit llvm to avoid running the binary, just check compilation
    const result = runCLI([dwarfFile, "--dwarf", "--emit", "llvm"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("LLVM IR written to");

    // Check for debug metadata in the generated LLVM IR file
    const irFile = dwarfFile.replace(".bpl", ".ll");
    expect(fs.existsSync(irFile)).toBe(true);
    const irContent = fs.readFileSync(irFile, "utf-8");

    // Check for basic DWARF metadata
    expect(irContent).toContain("!llvm.dbg.cu");
    expect(irContent).toContain("!DICompileUnit");
    expect(irContent).toContain("!DIFile");
    expect(irContent).toContain('filename: "main.bpl"');
  });

  it("should format files", () => {
    // Create a temporary unformatted file
    const tempFile = path.join(process.cwd(), "tests/temp_format.bpl");
    const unformatted = "frame  main ( )  ret  int { return 0 ; }";
    fs.writeFileSync(tempFile, unformatted);

    try {
      const result = runCLI(["format", tempFile]);
      expect(result.status).toBe(0);
      // Formatter should output formatted code to stdout
      expect(result.stdout).toContain("frame main() ret int {");
      expect(result.stdout).toContain("    return 0;");
      expect(result.stdout).toContain("}");
    } finally {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
  });
});
