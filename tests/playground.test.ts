import { describe, expect, it } from "bun:test";
import { spawnSync } from "child_process";
import { readFileSync } from "fs";
import { resolve } from "path";

const INDEX_PATH = "index.ts";
const TUTORIALS_PATH = resolve("playground/public/tutorials.json");

interface Tutorial {
  id: string;
  title: string;
  description: string;
  code: string;
}

const tutorialsData = JSON.parse(readFileSync(TUTORIALS_PATH, "utf-8"));
const tutorials: Tutorial[] = tutorialsData.tutorials;

describe("Playground Examples", () => {
  tutorials.forEach((tutorial) => {
    it(`should compile and run example: ${tutorial.title}`, () => {
      // Skip examples that are known to fail or require specific environment setup if any
      // For now, we try to run all of them.

      // Some examples might require input or specific files, we might need to handle that.
      // But most playground examples should be self-contained.

      const result = spawnSync("bun", [INDEX_PATH, "-r", "-e", tutorial.code], {
        encoding: "utf-8",
        // Set a timeout to prevent infinite loops in examples from hanging the test
        timeout: 5000,
      });

      if (result.status !== 0) {
        console.error(`Example '${tutorial.title}' failed:`);
        console.error("STDOUT:", result.stdout);
        console.error("STDERR:", result.stderr);
      }

      expect(result.status).toBe(0);
    });
  });
});
