import { describe, expect, it } from "bun:test";
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

describe("Enum Methods", () => {
  it("should parse enum with methods", () => {
    const source = `
      enum Status {
        Pending,
        Active,
        
        frame is_active(this: Status) ret bool {
            return true;
        }
      }
    `;
    const tokens = lexWithGrammar(source, "test.bpl");
    const parser = new Parser(source, "test.bpl", tokens);
    const program = parser.parse();

    const enumDecl = program.statements[0]!;
    expect(enumDecl.kind).toBe("EnumDecl");
    if (enumDecl.kind === "EnumDecl") {
      expect(enumDecl.methods.length).toBe(1);
      expect(enumDecl.methods[0]!.name).toBe("is_active");
    }
  });

  it("should type check enum method call", () => {
    const source = `
      enum Status {
        Pending,
        Active,
        
        frame is_active(this: Status) ret bool {
            return true;
        }
      }
      
      frame main() {
        local s: Status = Status.Active;
        local _b: bool = s.is_active();
      }
    `;
    expect(() => check(source)).not.toThrow();
  });

  it("should fail if method is not defined", () => {
    const source = `
      enum Status {
        Pending,
      }
      
      frame main() {
        local s: Status = Status.Pending;
        s.is_active();
      }
    `;
    expect(() => check(source)).toThrow();
  });
});
