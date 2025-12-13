import fs from "fs";
import path from "path";
import peggy from "peggy";
import * as AST from "../common/AST";
import { CompilerError, type SourceLocation } from "../common/CompilerError";

let cachedParser: peggy.Parser | null = null;

function loadParser(): peggy.Parser {
  if (cachedParser) return cachedParser;
  const grammarPath = path.resolve(__dirname, "../../grammar/bpl.peggy");
  const source = fs.readFileSync(grammarPath, "utf-8");
  cachedParser = peggy.generate(source, {
    output: "parser",
    format: "commonjs",
    cache: true,
  });
  return cachedParser;
}

function toSourceLocation(
  filePath: string,
  loc: peggy.SourceLocation,
): SourceLocation {
  return {
    file: filePath,
    startLine: loc.start.line,
    startColumn: loc.start.column,
    endLine: loc.end.line,
    endColumn: loc.end.column,
  };
}

export function parseWithPeggy(source: string, filePath: string): AST.Program {
  try {
    const parser = loadParser();
    return parser.parse(source, { filePath }) as AST.Program;
  } catch (error: unknown) {
    if (error && typeof error === "object" && "location" in error) {
      const loc = (error as peggy.ParserSyntaxError)
        .location as peggy.SourceLocation;
      const msg = (error as Error).message.split("\n")[0] || "Syntax error";
      throw new CompilerError(
        msg,
        "Syntax error",
        toSourceLocation(filePath, loc),
      );
    }
    throw error;
  }
}
