import { describe, expect, it, afterAll, beforeAll } from "bun:test";
import { spawnSync } from "child_process";
import { writeFileSync, unlinkSync, existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";

const INDEX_PATH = "index.ts";
const TEST_DIR = "tests/temp_stack_trace";

describe("Stack Trace Integration", () => {
  beforeAll(() => {
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR);
    }
  });

  afterAll(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("should print stack trace on uncaught exception (eval mode)", () => {
    const code = `
      frame foo() { throw 1; }
      frame main() { call foo(); }
    `;

    const result = spawnSync(
      "bun",
      [INDEX_PATH, "-r", "--stack-trace", "-e", code],
      {
        encoding: "utf-8",
      },
    );

    expect(result.status).not.toBe(0); // Should fail
    expect(result.stdout).toContain("Uncaught exception");
    expect(result.stdout).toContain("Stack trace:");
    expect(result.stdout).toContain("at foo");
    expect(result.stdout).toContain("at main");
  });

  it("should include file names and line numbers", () => {
    const filePath = join(TEST_DIR, "trace_test.x");
    const code = `
frame bar() {
    throw 42;
}
frame main() {
    call bar();
}
`;
    writeFileSync(filePath, code);

    const result = spawnSync(
      "bun",
      [INDEX_PATH, "-r", "--stack-trace", filePath],
      {
        encoding: "utf-8",
      },
    );

    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain("at bar");
    // Check for filename and line number (line 3 is throw)
    // The output format is: at func (file:line)
    expect(result.stdout).toMatch(/at bar \(.*trace_test\.x:3\)/);
    expect(result.stdout).toContain("at main");
  });

  it("should handle multi-file stack traces with relative paths", () => {
    const libPath = join(TEST_DIR, "lib.x");
    const mainPath = join(TEST_DIR, "main.x");

    writeFileSync(
      libPath,
      `
frame crash() {
    throw 100;
}
export crash;
`,
    );

    writeFileSync(
      mainPath,
      `
import crash from './lib.x';
frame main() {
    call crash();
}
`,
    );

    const result = spawnSync(
      "bun",
      [INDEX_PATH, "-r", "--stack-trace", mainPath],
      {
        encoding: "utf-8",
      },
    );

    expect(result.status).not.toBe(0);

    // Check for relative paths
    // lib.x is imported as ./lib.x, so it should appear as ./lib.x in stack trace
    expect(result.stdout).toContain("at crash");
    expect(result.stdout).toContain("./lib.x");

    // main.x is the entry file, so it should appear as main.x
    expect(result.stdout).toContain("at main");
    expect(result.stdout).toContain("main.x");
  });

  it("should format stack trace with tabs", () => {
    const filePath = join(TEST_DIR, "format_test.x");
    const code = `
frame main() {
    throw 1;
}
`;
    writeFileSync(filePath, code);

    const result = spawnSync(
      "bun",
      [INDEX_PATH, "-r", "--stack-trace", filePath],
      {
        encoding: "utf-8",
      },
    );

    expect(result.status).not.toBe(0);
    // Check for tab character (\t) before "at main"
    expect(result.stdout).toContain("\tat main");
  });
});
