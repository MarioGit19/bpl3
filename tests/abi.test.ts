import { describe, expect, it } from "bun:test";
import { spawnSync } from "child_process";

const INDEX_PATH = "index.ts";

describe("ABI Compatibility", () => {
  it("should correctly pass float arguments to variadic functions (printf)", () => {
    const code = `
      import printf from "libc";
      extern printf(fmt: *u8, ...);
      
      frame main() {
        call printf("Float: %.2f\\n", 1.234);
      }
    `;

    const result = spawnSync("bun", [INDEX_PATH, "-r", "-e", code], {
      encoding: "utf-8",
      timeout: 5000,
    });

    if (result.status !== 0) {
      console.error("STDOUT:", result.stdout);
      console.error("STDERR:", result.stderr);
    }

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Float: 1.23");
  });

  it("should correctly pass multiple float arguments to variadic functions", () => {
    const code = `
      import printf from "libc";
      extern printf(fmt: *u8, ...);
      
      frame main() {
        call printf("Floats: %.1f, %.1f\\n", 1.5, 2.5);
      }
    `;

    const result = spawnSync("bun", [INDEX_PATH, "-r", "-e", code], {
      encoding: "utf-8",
      timeout: 5000,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Floats: 1.5, 2.5");
  });
});
