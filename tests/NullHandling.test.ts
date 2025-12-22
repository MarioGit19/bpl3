import { describe, test, expect } from "bun:test";
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const BPL_CLI = path.resolve(__dirname, "../index.ts");

function compileAndRun(sourceCode: string) {
  const tempFile = path.join(
    __dirname,
    `temp_${Math.random().toString(36).substring(7)}.bpl`,
  );
  fs.writeFileSync(tempFile, sourceCode);

  try {
    const result = spawnSync("bun", [BPL_CLI, tempFile, "--run"], {
      encoding: "utf-8",
      cwd: __dirname,
    });

    if (result.status !== 0) {
      console.error("Compilation/Run failed:");
      console.error(result.stderr);
      console.error(result.stdout);
      throw new Error(`BPL execution failed with code ${result.status}`);
    }

    return result.stdout;
  } finally {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    const binFile = tempFile.replace(".bpl", "");
    if (fs.existsSync(binFile)) fs.unlinkSync(binFile);
    const llFile = tempFile.replace(".bpl", ".ll");
    if (fs.existsSync(llFile)) fs.unlinkSync(llFile);
  }
}

describe("Null Handling", () => {
  test("Null assignment and check", () => {
    const output = compileAndRun(`
      extern printf(fmt: *i8, ...) ret i32;

      struct Node {
        val: i32,
        next: *Node,
      }

      frame main() {
        local n: *Node = null;

        if (n == null) {
            printf("n is null\\n");
        }

        if (n != null) {
            printf("n is not null\\n");
        }

        local n2: Node;
        n2.val = 10;
        n2.next = null;

        if (n2.next == null) {
            printf("n2.next is null\\n");
        }
      }
    `);

    expect(output).toContain("n is null");
    expect(output).toContain("n2.next is null");
  });

  test("Null pointer dereference (should crash/error)", () => {
    // This test expects a runtime crash (exit code != 0)
    const source = `
      struct Node { val: i32, }
      frame main() {
        local n: *Node = null;
        local x: i32 = n.val; # Dereference null
      }
    `;

    const tempFile = path.join(
      __dirname,
      `temp_${Math.random().toString(36).substring(7)}.bpl`,
    );
    fs.writeFileSync(tempFile, source);

    try {
      const result = spawnSync("bun", [BPL_CLI, tempFile, "--run"], {
        encoding: "utf-8",
        cwd: __dirname,
      });

      // We expect it to fail at runtime (or maybe compile time if smart enough, but likely runtime)
      // If it returns 0, that's bad (silent failure or garbage data)
      // If it returns non-zero, that's good (crash)

      if (result.status === 0) {
        console.log("Output:", result.stdout);
        throw new Error("Expected crash but got success");
      }
    } finally {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      const binFile = tempFile.replace(".bpl", "");
      if (fs.existsSync(binFile)) fs.unlinkSync(binFile);
      const llFile = tempFile.replace(".bpl", ".ll");
      if (fs.existsSync(llFile)) fs.unlinkSync(llFile);
    }
  });
});
