import { describe, it, expect } from "bun:test";
import { lexWithGrammar } from "../compiler/frontend/GrammarLexer";
import { Parser } from "../compiler/frontend/Parser";
import { TypeChecker } from "../compiler/middleend/TypeChecker";

function check(source: string) {
  const tokens = lexWithGrammar(source, "test.bpl");
  const parser = new Parser(source, "test.bpl", tokens);
  const program = parser.parse();
  const typeChecker = new TypeChecker();
  typeChecker.checkProgram(program);
  const typeErrors = typeChecker.getErrors();
  if (typeErrors.length > 0) {
    throw typeErrors[0];
  }
  return program;
}

describe("Match Exhaustiveness with Guards", () => {
  it("should fail if a variant is only covered by a guarded arm", () => {
    const source = `
      enum Color { Red, Blue }
      
      frame main() {
        local c: Color = Color.Red;
        local x: int = match(c) {
          Color.Red if false => 1,
          Color.Blue => 2
        };
      }
    `;
    expect(() => check(source)).toThrow();
  });

  it("should pass if a variant is covered by a guarded arm AND a fallback arm", () => {
    const source = `
      enum Color { Red, Blue }
      
      frame main() {
        local c: Color = Color.Red;
        local _x: int = match(c) {
          Color.Red if false => 1,
          Color.Red => 3,
          Color.Blue => 2
        };
      }
    `;
    expect(() => check(source)).not.toThrow();
  });

  it("should pass if there is a wildcard fallback", () => {
    const source = `
      enum Color { Red, Blue }
      
      frame main() {
        local c: Color = Color.Red;
        local _x: int = match(c) {
          Color.Red if false => 1,
          _ => 2
        };
      }
    `;
    expect(() => check(source)).not.toThrow();
  });
});
