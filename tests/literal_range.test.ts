import { describe, expect, it } from "bun:test";
import Lexer from "../lexer/lexer";
import { Parser } from "../parser/parser";
import { SemanticAnalyzer } from "../transpiler/analysis/SemanticAnalyzer";
import Scope from "../transpiler/Scope";
import HelperGenerator from "../transpiler/HelperGenerator";

function analyze(input: string) {
  const lexer = new Lexer(input);
  const parser = new Parser(lexer.tokenize());
  const program = parser.parse();
  const analyzer = new SemanticAnalyzer();
  const scope = new Scope();

  if (!scope.resolveType("u8")) {
    HelperGenerator.generateBaseTypes(scope);
  }

  analyzer.analyze(program, scope, true);
  return { scope, analyzer, program };
}

describe("Literal Range Checks", () => {
  it("should not warn when literal fits in u8", () => {
    const input = `
      frame test() {
        local x: u8 = 100;
        local y: u8 = 255;
        local z: u8 = 0;
      }
    `;
    const { analyzer } = analyze(input);
    const warnings = analyzer.warnings.map((w) => w.message);
    expect(warnings.some((w) => w.includes("narrowing"))).toBeFalse();
  });

  it("should warn when literal exceeds u8", () => {
    const input = `
      frame test() {
        local x: u8 = 256;
      }
    `;
    const { analyzer } = analyze(input);
    const warnings = analyzer.warnings.map((w) => w.message);
    expect(warnings.some((w) => w.includes("narrowing"))).toBeTrue();
  });

  it("should not warn when literal fits in i8", () => {
    const input = `
      frame test() {
        local x: i8 = 100;
        local y: i8 = -100;
      }
    `;
    const { analyzer } = analyze(input);
    const warnings = analyzer.warnings.map((w) => w.message);
    expect(warnings.some((w) => w.includes("narrowing"))).toBeFalse();
  });

  it("should warn when literal exceeds i8", () => {
    const input = `
      frame test() {
        local x: i8 = 128;
      }
    `;
    const { analyzer } = analyze(input);
    const warnings = analyzer.warnings.map((w) => w.message);
    expect(warnings.some((w) => w.includes("narrowing"))).toBeTrue();
  });
});
