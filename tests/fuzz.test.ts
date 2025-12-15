import { describe, expect, it } from "bun:test";
import Lexer from "../lexer/lexer";
import { Parser } from "../parser/parser";
import { CompilerError } from "../errors";

const ITERATIONS = process.env.FUZZ_ITERATIONS
  ? parseInt(process.env.FUZZ_ITERATIONS)
  : 1000;
const MAX_LENGTH = 500;

function generateRandomString(length: number): string {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;':\",./<>?`~ \t\n";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

const KEYWORDS = [
  "frame",
  "local",
  "global",
  "if",
  "else",
  "loop",
  "break",
  "continue",
  "return",
  "struct",
  "import",
  "export",
  "sizeof",
  "cast",
  "asm",
  "u8",
  "u16",
  "u32",
  "u64",
  "i8",
  "i16",
  "i32",
  "i64",
  "f32",
  "f64",
  "void",
];

const OPERATORS = [
  "+",
  "-",
  "*",
  "/",
  "%",
  "=",
  "==",
  "!=",
  "<",
  ">",
  "<=",
  ">=",
  "&&",
  "||",
  "!",
  "&",
  "|",
  "^",
  "<<",
  ">>",
  "++",
  "--",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "(",
  ")",
  "{",
  "}",
  "[",
  "]",
  ",",
  ";",
  ":",
  ".",
];

function generateRandomTokenString(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    const type = Math.random();
    if (type < 0.1) {
      // Whitespace
      result += " ";
    } else if (type < 0.4) {
      // Keyword
      result += KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)] + " ";
    } else if (type < 0.7) {
      // Operator
      result += OPERATORS[Math.floor(Math.random() * OPERATORS.length)] + " ";
    } else if (type < 0.85) {
      // Identifier
      result += "var" + Math.floor(Math.random() * 100) + " ";
    } else {
      // Number
      result += Math.floor(Math.random() * 1000) + " ";
    }
  }
  return result;
}

describe("Parser Fuzzing", () => {
  it("should handle random character strings gracefully", () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const input = generateRandomString(
        Math.floor(Math.random() * MAX_LENGTH),
      );
      try {
        const lexer = new Lexer(input);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        parser.parse();
      } catch (e) {
        if (e instanceof CompilerError) {
          // Expected behavior for invalid input
          continue;
        }
        // If it's not a CompilerError, it might be a bug (or a generic Error we haven't converted yet)
        // For now, we fail if it's a system crash (e.g. RangeError, TypeError)
        // But we allow generic Error if it's one of the known ones we haven't fixed yet (though we fixed most)

        // We want to catch things like "Cannot read property of undefined"
        if (e instanceof TypeError || e instanceof RangeError) {
          console.error(`Fuzz failure on input: ${JSON.stringify(input)}`);
          console.error(e);
          throw e;
        }
      }
    }
  });

  it("should handle random token sequences gracefully", () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const input = generateRandomTokenString(
        Math.floor(Math.random() * MAX_LENGTH),
      );
      try {
        const lexer = new Lexer(input);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        parser.parse();
      } catch (e) {
        if (e instanceof CompilerError) {
          continue;
        }
        if (e instanceof TypeError || e instanceof RangeError) {
          console.error(`Fuzz failure on input: ${JSON.stringify(input)}`);
          console.error(e);
          throw e;
        }
      }
    }
  });
});
