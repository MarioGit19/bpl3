import { describe, expect, test } from "bun:test";
import Lexer from "../lexer/lexer";
import { Parser } from "../parser/parser";
import { SemanticAnalyzer } from "../transpiler/analysis/SemanticAnalyzer";
import HelperGenerator from "../transpiler/HelperGenerator";
import { IRGenerator } from "../transpiler/ir/IRGenerator";
import Scope from "../transpiler/Scope";
import { LLVMTargetBuilder } from "../transpiler/target/LLVMTargetBuilder";

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

describe("Static Methods", () => {
  test("should compile static method declaration", () => {
    const input = `
      struct Math {
        static add(a: i32, b: i32) ret i32 {
          return a + b;
        }
      }
      
      frame main() {
        call Math.add(1, 2);
      }
    `;
    const ir = generateIR(input);
    expect(ir).toContain("define i32 @__bplm__Math__add__(i32 %a, i32 %b)");
    // Should not have %this parameter
    expect(ir).not.toContain("define i32 @__bplm__Math__add__(%Math* %this");
  });

  test("should compile static factory method (constructor convention)", () => {
    const input = `
      struct Point {
        x: i32,
        y: i32,
        
        static new(x: i32, y: i32) ret Point {
          local p: Point;
          p.x = x;
          p.y = y;
          return p;
        }
      }
      
      frame main() {
        local p: Point = call Point.new(10, 20);
      }
    `;
    const ir = generateIR(input);
    expect(ir).toContain("define %Point @__bplm__Point__new__(i32 %x, i32 %y)");
  });

  test("should compile recursive static method", () => {
    const input = `
      struct Math {
        static fib(n: i32) ret i32 {
          if n <= 1 { return n; }
          return call Math.fib(n - 1) + call Math.fib(n - 2);
        }
      }
    `;
    const ir = generateIR(input);
    expect(ir).toContain("call i32 @__bplm__Math__fib__");
  });

  test("should compile generic static method", () => {
    const input = `
      struct Utils {
        static identity<T>(val: T) ret T {
          return val;
        }
      }
      
      frame main() {
        call Utils.identity<i32>(42);
      }
    `;
    const ir = generateIR(input);
    // Check for monomorphized name
    expect(ir).toContain(
      "define i32 @__bplm__Utils__identity____i32(i32 %val)",
    );
  });

  test("should fail when calling static method on instance", () => {
    const input = `
      struct Math {
        static add(a: i32, b: i32) ret i32 { return a + b; }
      }
      frame main() {
        local m: Math;
        call m.add(1, 2);
      }
    `;
    expect(() => generateIR(input)).toThrow(
      "Cannot call static method 'add' on an instance of 'Math'",
    );
  });

  test("should fail when calling instance method on type", () => {
    const input = `
      struct Counter {
        count: i32,
        frame inc() { this.count = this.count + 1; }
      }
      frame main() {
        call Counter.inc();
      }
    `;
    expect(() => generateIR(input)).toThrow(
      "Cannot call instance method 'inc' on type 'Counter'",
    );
  });

  test("should allow instance method to call static method", () => {
    const input = `
      struct Logger {
        static log() { }
      }
      struct Worker {
        frame work() {
          call Logger.log();
        }
      }
    `;
    const ir = generateIR(input);
    expect(ir).toContain("call void @__bplm__Logger__log__");
  });
});
