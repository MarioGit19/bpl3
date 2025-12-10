import { describe, it, expect } from "bun:test";
import { Lexer } from "../src/Lexer";
import { TokenType } from "../src/TokenType";

describe("Lexer", () => {
  it("should tokenize basic symbols", () => {
    const source = "(){}[],;:";
    const lexer = new Lexer(source, "test.bpl");
    const tokens = lexer.scanTokens();

    expect(tokens.length).toBe(10); // 9 symbols + EOF
    expect(tokens[0].type).toBe(TokenType.LeftParen);
    expect(tokens[1].type).toBe(TokenType.RightParen);
    expect(tokens[2].type).toBe(TokenType.LeftBrace);
    expect(tokens[3].type).toBe(TokenType.RightBrace);
    expect(tokens[4].type).toBe(TokenType.LeftBracket);
    expect(tokens[5].type).toBe(TokenType.RightBracket);
    expect(tokens[6].type).toBe(TokenType.Comma);
    expect(tokens[7].type).toBe(TokenType.Semicolon);
    expect(tokens[8].type).toBe(TokenType.Colon);
    expect(tokens[9].type).toBe(TokenType.EOF);
  });

  it("should tokenize keywords", () => {
    const source = "frame struct return if else";
    const lexer = new Lexer(source, "test.bpl");
    const tokens = lexer.scanTokens();

    expect(tokens[0].type).toBe(TokenType.Frame);
    expect(tokens[1].type).toBe(TokenType.Struct);
    expect(tokens[2].type).toBe(TokenType.Return);
    expect(tokens[3].type).toBe(TokenType.If);
    expect(tokens[4].type).toBe(TokenType.Else);
  });

  it("should tokenize identifiers", () => {
    const source = "myVar another_var";
    const lexer = new Lexer(source, "test.bpl");
    const tokens = lexer.scanTokens();

    expect(tokens[0].type).toBe(TokenType.Identifier);
    expect(tokens[0].lexeme).toBe("myVar");
    expect(tokens[1].type).toBe(TokenType.Identifier);
    expect(tokens[1].lexeme).toBe("another_var");
  });

  it("should tokenize numbers", () => {
    const source = "123 45.67 0xFF";
    const lexer = new Lexer(source, "test.bpl");
    const tokens = lexer.scanTokens();

    expect(tokens[0].type).toBe(TokenType.NumberLiteral);
    expect(tokens[0].literal).toBe(123);
    expect(tokens[1].type).toBe(TokenType.NumberLiteral);
    expect(tokens[1].literal).toBe(45.67);
    expect(tokens[2].type).toBe(TokenType.NumberLiteral);
    expect(tokens[2].literal).toBe(255);
  });

  it("should tokenize strings", () => {
    const source = '"hello world"';
    const lexer = new Lexer(source, "test.bpl");
    const tokens = lexer.scanTokens();

    expect(tokens[0].type).toBe(TokenType.StringLiteral);
    expect(tokens[0].literal).toBe("hello world");
  });
});
