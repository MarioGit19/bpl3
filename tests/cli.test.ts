import { describe, expect, it } from "bun:test";
import { spawnSync } from "child_process";
import { readdirSync } from "fs";

const INDEX_PATH = "index.ts";

describe("CLI Arguments", () => {
  describe("-e / --eval flag", () => {
    it("should compile and run valid code", () => {
      const code = `import printf from 'libc'; frame main() { call printf("CLI_TEST_SUCCESS"); }`;
      const result = spawnSync("bun", [INDEX_PATH, "-r", "-e", code], {
        encoding: "utf-8",
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("CLI_TEST_SUCCESS");
    });

    it("should report errors for invalid code", () => {
      const code = `frame main() { syntax error }`;
      const result = spawnSync("bun", [INDEX_PATH, "-e", code], {
        encoding: "utf-8",
      });

      expect(result.status).toBe(1);
    });

    it("should clean up temporary eval files", () => {
      const code = `import printf from 'libc'; frame main() { call printf("CLEANUP_TEST"); }`;
      spawnSync("bun", [INDEX_PATH, "-r", "-e", code]);

      // Check current directory for eval_*.x files
      const files = readdirSync(".").filter(
        (f) => f.startsWith("eval_") && f.endsWith(".x"),
      );
      expect(files.length).toBe(0);
    });
  });

  describe("Other flags", () => {
    it("should print assembly with -p", () => {
      const code = `frame main() {}`;
      const result = spawnSync("bun", [INDEX_PATH, "-p", "-e", code], {
        encoding: "utf-8",
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Generated LLVM IR");
      expect(result.stdout).toContain("define i32 @main");
    });

    it("should print AST with --print-ast", () => {
      const code = `frame main() {}`;
      const result = spawnSync("bun", [INDEX_PATH, "--print-ast", "-e", code], {
        encoding: "utf-8",
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('"type": "FunctionDeclaration"');
      expect(result.stdout).toContain('"name": "main"');
    });

    it("should respect quiet mode -q", () => {
      const code = `frame main() {}`;
      const result = spawnSync("bun", [INDEX_PATH, "-q", "-e", code], {
        encoding: "utf-8",
      });
      expect(result.status).toBe(0);
      // In quiet mode, we shouldn't see standard info logs, but we might see errors if any.
      // Since it's successful, stdout should be minimal or empty depending on implementation.
      // Our Logger implementation might still print some things or nothing.
      // Let's check that it DOES NOT contain "Transpiling" which is an info log.
      expect(result.stdout).not.toContain("--- 1. Transpiling");
    });
  });
});
