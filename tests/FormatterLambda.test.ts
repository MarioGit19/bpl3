import { describe, expect, it } from "bun:test";
import { Formatter } from "../compiler/formatter/Formatter";
import { lexWithGrammar } from "../compiler/frontend/GrammarLexer";
import { Parser } from "../compiler/frontend/Parser";

function format(code: string): string {
  const tokens = lexWithGrammar(code, "test.bpl");
  const parser = new Parser(code, "test.bpl", tokens);
  const ast = parser.parse();
  const formatter = new Formatter();
  return formatter.format(ast).trim();
}

describe("Formatter - Lambda Expressions", () => {
  it("should format simple lambda", () => {
    const code = `frame main() { local f: Func<int>(int) = |x: int| ret int { return x; }; }`;
    const formatted = format(code);
    expect(formatted).toContain(`|x: int| ret int {`);
    expect(formatted).toContain(`return x;`);
  });

  it("should format lambda without return type", () => {
    const code = `frame main() { local f: Func<void>(int) = |x: int| { return; }; }`;
    const formatted = format(code);
    expect(formatted).toContain(`|x: int| {`);
  });

  it("should format lambda with multiple params", () => {
    const code = `frame main() { local f: Func<int>(int, int) = |x: int, y: int| ret int { return x + y; }; }`;
    const formatted = format(code);
    expect(formatted).toContain(`|x: int, y: int| ret int {`);
  });

  it("should format lambda with no params", () => {
    const code = `frame main() { local f: Func<int>() = || ret int { return 42; }; }`;
    const formatted = format(code);
    expect(formatted).toContain(`|| ret int {`);
  });
});
