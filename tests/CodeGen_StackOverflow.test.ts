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

describe("CodeGen - Stack Overflow", () => {
  it("should generate stack depth check", () => {
    const source = `
      frame main() {
        return;
      }
    `;
    const ir = generate(source);

    // Check for increment at start
    expect(ir).toContain("@__bpl_stack_depth");
    expect(ir).toContain("add i32");
    expect(ir).toContain("icmp ugt i32");
    expect(ir).toContain("10000");
    expect(ir).toContain("%struct.StackOverflowError");

    // Check for decrement at return
    expect(ir).toContain("sub i32");
  });
});
