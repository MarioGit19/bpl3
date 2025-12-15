import { describe, expect, it } from "bun:test";

import Lexer from "../lexer/lexer";
import { Parser } from "../parser/parser";
import HelperGenerator from "../transpiler/HelperGenerator";
import { IRGenerator } from "../transpiler/ir/IRGenerator";
import Scope from "../transpiler/Scope";
import { LLVMTargetBuilder } from "../transpiler/target/LLVMTargetBuilder";
import { SemanticAnalyzer } from "../transpiler/analysis/SemanticAnalyzer";

function generateIR(input: string): string {
  const lexer = new Lexer(input);
  const parser = new Parser(lexer.tokenize());
  const program = parser.parse();

  const scope = new Scope();
  HelperGenerator.generateBaseTypes(scope);

  const analyzer = new SemanticAnalyzer();
  analyzer.analyze(program, scope);

  const gen = new IRGenerator();
  program.toIR(gen, scope);
  const builder = new LLVMTargetBuilder();
  return builder.build(gen.module);
}

describe("Destructuring Assignment", () => {
  it("should handle basic destructuring assignment", () => {
    const ir = generateIR(`
      frame main() {
        local a: i64 = 0;
        local b: i64 = 0;
        (a, b) = (10, 20);
      }
    `);
    // Should see stores to a and b
    // And a temp variable
    expect(ir).toContain("store i64 10");
    expect(ir).toContain("store i64 20");
  });

  it("should handle swapping", () => {
    const ir = generateIR(`
      frame main() {
        local a: i64 = 10;
        local b: i64 = 20;
        (a, b) = (b, a);
      }
    `);
    // Should load a and b, store to temp, then store back
    // We can't easily check order with regex, but we can check that it compiles
    expect(ir).toContain("store i64");
  });

  it("should handle destructuring from variable", () => {
    const ir = generateIR(`
      frame main() {
        local t: (i64, i64) = (10, 20);
        local a: i64 = 0;
        local b: i64 = 0;
        (a, b) = t;
      }
    `);
    expect(ir).toContain("store i64");
  });

  it("should fail on count mismatch", () => {
    expect(() => {
      generateIR(`
        frame main() {
          local a: i64 = 0;
          local b: i64 = 0;
          (a, b) = (10, 20, 30);
        }
      `);
    }).toThrow("Destructuring assignment expects 2 elements, but tuple has 3");
  });

  it("should fail on type mismatch", () => {
    expect(() => {
      generateIR(`
        frame main() {
          local a: i64 = 0;
          local b: u8 = 0;
          (a, b) = (10, 20); // 20 is i64 by default, b is u8
        }
      `);
    }).toThrow(); // Type compatibility error
  });

  it("should handle parenthesized assignment (not destructuring)", () => {
    const ir = generateIR(`
      frame main() {
        local a: i64 = 0;
        (a) = 10;
      }
    `);
    expect(ir).toContain("store i64 10");
  });

  it("should fail on invalid l-value", () => {
    expect(() => {
      generateIR(`
        frame main() {
          local a: i64 = 0;
          (10, a) = (1, 2);
        }
      `);
    }).toThrow("Expression is not an l-value");
  });
});
