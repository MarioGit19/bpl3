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

describe("Match No Implicit Return", () => {
  it("should fail if match arm block has no explicit return when type is expected", () => {
    const source = `
      enum Shape { Circle }
      
      frame main() {
        local s: Shape = Shape.Circle;
        # Expecting int, but block returns void (no return stmt)
        local _x: int = match(s) {
          Shape.Circle => {
            10; 
          }
        };
      }
    `;
    expect(() => check(source)).toThrow();
  });

  it("should pass if match arm block has explicit return", () => {
    const source = `
      enum Shape { Circle }
      
      frame main() {
        local s: Shape = Shape.Circle;
        local _x: int = match(s) {
          Shape.Circle => {
            return 10;
          }
        };
      }
    `;
    expect(() => check(source)).not.toThrow();
  });

  it("should pass if match arm is an expression", () => {
    const source = `
      enum Shape { Circle }
      
      frame main() {
        local s: Shape = Shape.Circle;
        local _x: int = match(s) {
          Shape.Circle => 10
        };
      }
    `;
    expect(() => check(source)).not.toThrow();
  });
});
