import { describe, expect, it } from "bun:test";
import { lexWithGrammar } from "../compiler/frontend/GrammarLexer";
import { Parser } from "../compiler/frontend/Parser";
import * as AST from "../compiler/common/AST";

function parse(code: string): AST.Program {
  const tokens = lexWithGrammar(code, "test.bpl");
  const parser = new Parser(code, "test.bpl", tokens);
  return parser.parse();
}

describe("Parser - Lambda Expressions", () => {
  it("should parse simple lambda", () => {
    const code = `frame main() { local f: Func<int>(int) = |x: int| ret int { return x; }; }`;
    const ast = parse(code);
    const main = ast.statements[0] as AST.FunctionDecl;
    const varDecl = main.body.statements[0] as AST.VariableDecl;
    const lambda = varDecl.initializer as AST.LambdaExpr;

    expect(lambda.kind).toBe("LambdaExpression");
    expect(lambda.params.length).toBe(1);
    expect(lambda.params[0]!.name).toBe("x");
    expect((lambda.params[0]!.type as AST.BasicTypeNode).name).toBe("int");
    expect((lambda.returnType as AST.BasicTypeNode).name).toBe("int");
    expect(lambda.body.statements.length).toBe(1);
  });

  it("should parse lambda without return type", () => {
    const code = `frame main() { local f: Func<void>(int) = |x: int| { return; }; }`;
    const ast = parse(code);
    const main = ast.statements[0] as AST.FunctionDecl;
    const varDecl = main.body.statements[0] as AST.VariableDecl;
    const lambda = varDecl.initializer as AST.LambdaExpr;

    expect(lambda.kind).toBe("LambdaExpression");
    expect(lambda.returnType).toBeNull();
  });

  it("should parse lambda with multiple params", () => {
    const code = `frame main() { local f: Func<int>(int, int) = |x: int, y: int| ret int { return x + y; }; }`;
    const ast = parse(code);
    const main = ast.statements[0] as AST.FunctionDecl;
    const varDecl = main.body.statements[0] as AST.VariableDecl;
    const lambda = varDecl.initializer as AST.LambdaExpr;

    expect(lambda.params.length).toBe(2);
    expect(lambda.params[0]!.name).toBe("x");
    expect(lambda.params[1]!.name).toBe("y");
  });

  it("should parse lambda with no params", () => {
    const code = `frame main() { local f: Func<int>() = || ret int { return 42; }; }`;
    const ast = parse(code);
    const main = ast.statements[0] as AST.FunctionDecl;
    const varDecl = main.body.statements[0] as AST.VariableDecl;
    const lambda = varDecl.initializer as AST.LambdaExpr;

    expect(lambda.params.length).toBe(0);
  });

  it("should parse lambda passed as argument", () => {
    const code = `
      frame apply(f: Func<int>(int), x: int) ret int { return f(x); }
      frame main() {
        apply(|x: int| ret int { return x * 2; }, 10);
      }
    `;
    const ast = parse(code);
    const main = ast.statements[1] as AST.FunctionDecl;
    const call = main.body.statements[0] as AST.ExpressionStmt;
    const callExpr = call.expression as AST.CallExpr;
    const lambda = callExpr.args[0] as AST.LambdaExpr;

    expect(lambda.kind).toBe("LambdaExpression");
    expect(lambda.params[0]!.name).toBe("x");
  });
  it("should parse lambda with explicit void args", () => {
    const code = `frame main() { local f: Func<int>() = |void| ret int { return 42; }; }`;
    const ast = parse(code);
    const main = ast.statements[0] as AST.FunctionDecl;
    const varDecl = main.body.statements[0] as AST.VariableDecl;
    const lambda = varDecl.initializer as AST.LambdaExpr;

    expect(lambda.params.length).toBe(0);
  });

  it("should parse lambda with void args and no return type", () => {
    const code = `frame main() { local f: Func<void>() = |void| { return; }; }`;
    const ast = parse(code);
    const main = ast.statements[0] as AST.FunctionDecl;
    const varDecl = main.body.statements[0] as AST.VariableDecl;
    const lambda = varDecl.initializer as AST.LambdaExpr;

    expect(lambda.params.length).toBe(0);
    expect(lambda.returnType).toBeNull();
  });

  it("should parse lambda with empty args and no return type", () => {
    const code = `frame main() { local f: Func<void>() = || { return; }; }`;
    const ast = parse(code);
    const main = ast.statements[0] as AST.FunctionDecl;
    const varDecl = main.body.statements[0] as AST.VariableDecl;
    const lambda = varDecl.initializer as AST.LambdaExpr;

    expect(lambda.params.length).toBe(0);
    expect(lambda.returnType).toBeNull();
  });

  it("should parse lambda with underscore param", () => {
    const code = `frame main() { local f: Func<int>(int) = |_| ret int { return 42; }; }`;
    const ast = parse(code);
    const main = ast.statements[0] as AST.FunctionDecl;
    const varDecl = main.body.statements[0] as AST.VariableDecl;
    const lambda = varDecl.initializer as AST.LambdaExpr;

    expect(lambda.params.length).toBe(1);
    expect(lambda.params[0]!.name).toBe("_");
  });
});
