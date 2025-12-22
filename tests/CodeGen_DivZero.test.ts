import { describe, expect, it } from "bun:test";
import { lexWithGrammar } from "../compiler/frontend/GrammarLexer";
import { Parser } from "../compiler/frontend/Parser";
import { TypeChecker } from "../compiler/middleend/TypeChecker";
import { CodeGenerator } from "../compiler/backend/CodeGenerator";

function generate(source: string) {
  const tokens = lexWithGrammar(source, "test.bpl");
  const parser = new Parser(source, "test.bpl", tokens);
  const program = parser.parse();
  const typeChecker = new TypeChecker();
  typeChecker.checkProgram(program);
  const codeGenerator = new CodeGenerator();
  return codeGenerator.generate(program);
}

describe("CodeGen - Division By Zero", () => {
  it("should generate zero check for division", () => {
    const source = `
      frame main() {
        local a: i32 = 10;
        local b: i32 = 0;
        local x: i32 = a / b;
      }
    `;
    const ir = generate(source);

    expect(ir).toContain("icmp eq i32");
    expect(ir).toContain(", 0");
    expect(ir).toContain("br i1");
    expect(ir).toContain("%struct.DivisionByZeroError");
    expect(ir).toContain("insertvalue %struct.DivisionByZeroError");
  });

  it("should generate zero check for modulo", () => {
    const source = `
      frame main() {
        local a: i32 = 10;
        local b: i32 = 0;
        local x: i32 = a % b;
      }
    `;
    const ir = generate(source);

    expect(ir).toContain("%struct.DivisionByZeroError");
  });
});
