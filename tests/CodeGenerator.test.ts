import { describe, it, expect } from "bun:test";
import { Lexer } from "../compiler/frontend/Lexer";
import { Parser } from "../compiler/frontend/Parser";
import { TypeChecker } from "../compiler/middleend/TypeChecker";
import { CodeGenerator } from "../compiler/backend/CodeGenerator";

function compile(source: string): string {
    const lexer = new Lexer(source, "test.bpl");
    const tokens = lexer.scanTokens();
    const parser = new Parser(tokens);
    const program = parser.parse();
    const typeChecker = new TypeChecker();
    typeChecker.checkProgram(program);
    const generator = new CodeGenerator();
    return generator.generate(program);
}

describe("CodeGenerator", () => {
  it("should generate code for a simple function", () => {
    const source = "frame main() { return; }";
    const ir = compile(source);
    expect(ir).toContain("define void @main() {");
    expect(ir).toContain("ret void");
  });

  it("should generate code for arithmetic", () => {
    const source = `
      frame add(a: int, b: int) ret int {
        return a + b;
      }
    `;
    const ir = compile(source);
    expect(ir).toContain("define i32 @add(i32 %a, i32 %b)");
    expect(ir).toContain("add i32");
    expect(ir).toContain("ret i32");
  });

  it("should generate code for struct methods", () => {
    const source = `
      struct Point {
        x: int,
        y: int,
        frame sum(this: Point) ret int {
          return this.x + this.y;
        }
      }
    `;
    const ir = compile(source);
    expect(ir).toContain("%struct.Point = type { i32, i32 }");
    // Check for mangled name
    expect(ir).toContain("define i32 @Point_sum(%struct.Point %this)");
  });
});
