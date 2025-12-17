import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import * as peggy from "peggy";

import * as AST from "../common/AST";
import { CompilerError, type SourceLocation } from "../common/CompilerError";

let cachedParser: peggy.Parser | null = null;

function loadParser(): peggy.Parser {
  if (cachedParser) return cachedParser;

  // Try multiple paths to find bpl.peggy
  // 1. Relative to current module (for normal execution)
  let grammarPath = resolve(__dirname, "../../grammar/bpl.peggy");

  // 2. Relative to process.cwd() (for compiled binary)
  if (!existsSync(grammarPath)) {
    grammarPath = resolve(process.cwd(), "grammar/bpl.peggy");
  }

  // 3. Relative to the executable directory (for installed binary)
  if (!existsSync(grammarPath)) {
    const execDir = dirname(process.argv[1] || process.execPath);
    grammarPath = resolve(execDir, "grammar/bpl.peggy");
  }

  // 4. Try looking in common install locations
  if (!existsSync(grammarPath)) {
    grammarPath = resolve("/usr/local/lib/bpl/grammar/bpl.peggy");
  }

  if (!existsSync(grammarPath)) {
    throw new Error(
      `Could not find bpl.peggy grammar file. Searched in:\n` +
        `  - ${resolve(__dirname, "../../grammar/bpl.peggy")}\n` +
        `  - ${resolve(process.cwd(), "grammar/bpl.peggy")}\n` +
        `  - ${resolve(dirname(process.argv[1] || process.execPath), "grammar/bpl.peggy")}\n` +
        `Please ensure the grammar directory is present.`,
    );
  }

  const source = readFileSync(grammarPath, "utf-8");
  cachedParser = peggy.generate(source, {
    output: "parser",
    format: "commonjs",
    cache: true,
  });
  return cachedParser;
}

function toSourceLocation(
  filePath: string,
  loc: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  },
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
    const parser: peggy.Parser = loadParser();
    const comments: any[] = [];
    const program = parser.parse(source, { filePath, comments }) as AST.Program;
    program.comments = comments;
    return program;
  } catch (error: unknown) {
    const err = error as (Error & { location?: any }) | unknown;
    if (isPeggySyntaxError(err)) {
      const loc = err.location as {
        start: { line: number; column: number };
        end: { line: number; column: number };
      };
      const baseMsg: string =
        typeof err.message === "string" ? err.message : "Syntax error";
      const parts = baseMsg.split("\n");
      const msg: string = parts[0] ?? baseMsg;
      throw new CompilerError(
        msg,
        "Syntax error",
        toSourceLocation(filePath, loc),
      );
    }
    throw error;
  }
}

function isPeggySyntaxError(e: unknown): e is {
  message: string;
  location: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
} {
  return (
    !!e &&
    typeof e === "object" &&
    "message" in e &&
    typeof (e as any).message === "string" &&
    "location" in e &&
    (e as any).location &&
    typeof (e as any).location === "object" &&
    "start" in (e as any).location &&
    "end" in (e as any).location
  );
}
