import { describe, test, expect } from "bun:test";
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const BPL_CLI = path.resolve(__dirname, "../index.ts");

function compile(sourcePath: string) {
  const result = spawnSync("bun", [BPL_CLI, sourcePath], {
    encoding: "utf-8",
    cwd: path.dirname(sourcePath),
  });

  if (result.status !== 0) {
    console.error(`Compilation of ${sourcePath} failed:`);
    console.error(result.stderr);
    console.error(result.stdout);
  }
  return result;
}

describe("Examples Compilation", () => {
  test("HTTP Server compiles", () => {
    const sourcePath = path.resolve(
      __dirname,
      "../examples/http_server/main.bpl",
    );
    const result = compile(sourcePath);
    expect(result.status).toBe(0);

    // Cleanup
    const binPath = sourcePath.replace(".bpl", "");
    if (fs.existsSync(binPath)) fs.unlinkSync(binPath);
    const llPath = sourcePath.replace(".bpl", ".ll");
    if (fs.existsSync(llPath)) fs.unlinkSync(llPath);
    const oPath = sourcePath.replace(".bpl", ".o");
    if (fs.existsSync(oPath)) fs.unlinkSync(oPath);
  });

  test("Task Manager compiles", () => {
    const sourcePath = path.resolve(
      __dirname,
      "../examples/task_manager/main.bpl",
    );
    const result = compile(sourcePath);
    expect(result.status).toBe(0);

    // Cleanup
    const binPath = sourcePath.replace(".bpl", "");
    if (fs.existsSync(binPath)) fs.unlinkSync(binPath);
    const llPath = sourcePath.replace(".bpl", ".ll");
    if (fs.existsSync(llPath)) fs.unlinkSync(llPath);
    const oPath = sourcePath.replace(".bpl", ".o");
    if (fs.existsSync(oPath)) fs.unlinkSync(oPath);
  });

  test("Collatz compiles", () => {
    const sourcePath = path.resolve(__dirname, "../examples/collatz/main.bpl");
    const result = compile(sourcePath);
    expect(result.status).toBe(0);

    // Cleanup
    const binPath = sourcePath.replace(".bpl", "");
    if (fs.existsSync(binPath)) fs.unlinkSync(binPath);
    const llPath = sourcePath.replace(".bpl", ".ll");
    if (fs.existsSync(llPath)) fs.unlinkSync(llPath);
    const oPath = sourcePath.replace(".bpl", ".o");
    if (fs.existsSync(oPath)) fs.unlinkSync(oPath);
  });

  test("Fibonacci compiles", () => {
    const sourcePath = path.resolve(
      __dirname,
      "../examples/fibonacci/main.bpl",
    );
    const result = compile(sourcePath);
    expect(result.status).toBe(0);

    // Cleanup
    const binPath = sourcePath.replace(".bpl", "");
    if (fs.existsSync(binPath)) fs.unlinkSync(binPath);
    const llPath = sourcePath.replace(".bpl", ".ll");
    if (fs.existsSync(llPath)) fs.unlinkSync(llPath);
    const oPath = sourcePath.replace(".bpl", ".o");
    if (fs.existsSync(oPath)) fs.unlinkSync(oPath);
  });

  test("Complex Data Structures compiles", () => {
    const sourcePath = path.resolve(
      __dirname,
      "../examples/complex_data_structures/main.bpl",
    );
    const result = compile(sourcePath);
    expect(result.status).toBe(0);

    // Cleanup
    const binPath = sourcePath.replace(".bpl", "");
    if (fs.existsSync(binPath)) fs.unlinkSync(binPath);
    const llPath = sourcePath.replace(".bpl", ".ll");
    if (fs.existsSync(llPath)) fs.unlinkSync(llPath);
    const oPath = sourcePath.replace(".bpl", ".o");
    if (fs.existsSync(oPath)) fs.unlinkSync(oPath);
  });
});
