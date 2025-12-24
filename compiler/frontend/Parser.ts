import * as AST from "../common/AST";
import { parseWithPeggy } from "./PeggyParser";
import { Token } from "./Token";
import { TokenType } from "./TokenType";

export class Parser {
  private readonly source: string;
  private readonly filePath: string;
  private readonly tokens: Token[];

  constructor(source: string, filePath: string, tokens: Token[] = []) {
    this.source = source;
    this.filePath = filePath;
    this.tokens = tokens;
  }

  public parse(injectImplicitImports: boolean = false): AST.Program {
    const ast = parseWithPeggy(this.source, this.filePath);

    // Implicitly import Error from std/errors.bpl if not already in errors.bpl
    const isErrorsBpl =
      this.filePath.endsWith("errors.bpl") ||
      this.filePath.endsWith("errors.x");
    if (injectImplicitImports && !isErrorsBpl) {
      const errorImport: AST.ImportStmt = {
        kind: "Import",
        items: [{ name: "Error", isType: true, isWrapped: false }],
        source: "std/errors.bpl",
        importAll: false,
        isImplicit: true,
        location: {
          file: this.filePath,
          startLine: 0,
          startColumn: 0,
          endLine: 0,
          endColumn: 0,
        },
      };
      ast.statements.unshift(errorImport);
    }

    if (this.tokens.length > 0) {
      const comments = this.tokens.filter((t) => t.type === TokenType.Comment);
      return { ...ast, comments };
    }
    return ast;
  }
}
