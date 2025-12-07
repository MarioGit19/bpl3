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

describe("Tuples", () => {
  it("should generate tuple type definition", () => {
    const ir = generateIR(`
      frame main() {
        local t: (i64, u8);
      }
    `);
    expect(ir).toContain("{ i64, i8 }");
  });

  it("should generate tuple literal", () => {
    const ir = generateIR(`
      frame main() {
        local t: (i64, i64) = (10, 20);
      }
    `);
    // Should see stores or inserts
    expect(ir).toContain("store i64 10");
    expect(ir).toContain("store i64 20");
  });

  it("should handle tuple member access", () => {
    const ir = generateIR(`
      frame main() {
        local t: (i64, i64) = (10, 20);
        local x: i64 = t.0;
        local y: i64 = t.1;
      }
    `);
    expect(ir).toContain("getelementptr");
    expect(ir).toContain(", i32 0, i32 0"); // Access index 0
    expect(ir).toContain(", i32 0, i32 1"); // Access index 1
  });

  it("should handle tuple destructuring", () => {
    const ir = generateIR(`
      frame main() {
        local t: (i64, i64) = (10, 20);
        local (a: i64, b: i64) = t;
      }
    `);
    // Destructuring generates temp variable and assignments
    expect(ir).toContain("alloca"); // For variables
    expect(ir).toContain("store");
  });

  it("should return tuple from function", () => {
    const ir = generateIR(`
      frame make_pair(a: i64, b: i64) ret (i64, i64) {
        return (a, b);
      }
    `);
    expect(ir).toContain("define { i64, i64 } @make_pair");
    expect(ir).toContain("ret { i64, i64 }");
  });

  it("should pass tuple as argument", () => {
    const ir = generateIR(`
      frame process_pair(p: (i64, i64)) {
        local x: i64 = p.0;
      }
    `);
    expect(ir).toContain("define void @process_pair({ i64, i64 } %p)");
  });

  it("should handle pointer to tuple access (*t.0)", () => {
    const ir = generateIR(`
      frame main() {
        local t: (i64, i64) = (10, 20);
        local ptr: *(i64, i64) = &t;
        local x: i64 = *ptr.0; 
      }
    `);
    expect(ir).toContain("getelementptr");
  });

  it("should handle nested tuples", () => {
    const ir = generateIR(`
        frame main() {
            local t: ((i64, i64), i64) = ((1, 2), 3);
            local inner: (i64, i64) = t.0;
            local val: i64 = t.0.1;
        }
      `);
    expect(ir).toContain("{ { i64, i64 }, i64 }");
  });
});
