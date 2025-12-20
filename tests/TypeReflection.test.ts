import { describe, expect, it } from "bun:test";
import { spawnSync } from "child_process";
import * as path from "path";

const EXAMPLES_DIR = path.join(process.cwd(), "examples", "type_reflection");
const CMP_SCRIPT = path.join(process.cwd(), "cmp.sh");

describe("Type Reflection Tests", () => {
  it("should compile and run polymorphism.bpl", () => {
    const file = path.relative(
      process.cwd(),
      path.join(EXAMPLES_DIR, "polymorphism.bpl"),
    );
    const result = spawnSync(CMP_SCRIPT, [file], { encoding: "utf-8" });

    if (result.status !== 0) {
      console.error("Compilation failed:");
      console.error(result.stderr);
      console.error(result.stdout);
    }
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Object is a: Dog");
    expect(result.stdout).toContain("Object is a: Cat");
  });

  it("should compile and run generics_check.bpl", () => {
    const file = path.relative(
      process.cwd(),
      path.join(EXAMPLES_DIR, "generics_check.bpl"),
    );
    const result = spawnSync(CMP_SCRIPT, [file], { encoding: "utf-8" });

    if (result.status !== 0) {
      console.error("Compilation failed:");
      console.error(result.stderr);
      console.error(result.stdout);
    }
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("It is an integer wrapper");
    expect(result.stdout).toContain("It is a float wrapper");
  });
});
