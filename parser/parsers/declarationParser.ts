import type { IParser } from "../IParser";
import { CompilerError } from "../../errors";
import Token from "../../lexer/token";
import TokenType from "../../lexer/tokenType";
import BlockExpr from "../expression/blockExpr";
import ExportExpr from "../expression/exportExpr";
import ExternDeclarationExpr from "../expression/externDeclarationExpr";
import FunctionDeclarationExpr from "../expression/functionDeclaration";
import IdentifierExpr from "../expression/identifierExpr";
import ImportExpr from "../expression/importExpr";
import MemberAccessExpr from "../expression/memberAccessExpr";
import NumberLiteralExpr from "../expression/numberLiteralExpr";
import StructDeclarationExpr, {
  type StructField,
} from "../expression/structDeclarationExpr";
import VariableDeclarationExpr, {
  type VariableType,
} from "../expression/variableDeclarationExpr";
import DestructuringDeclarationExpr from "../expression/destructuringDeclarationExpr";
import type Expression from "../expression/expr";

export class DeclarationParser {
  constructor(private parser: IParser) {}

  parseVariableDeclaration():
    | VariableDeclarationExpr
    | DestructuringDeclarationExpr {
    return this.parser.withRange(() => {
      const scopeToken = this.parser.consume(TokenType.IDENTIFIER);
      let isConst = false;
      if (
        this.parser.peek() &&
        this.parser.peek()!.type === TokenType.IDENTIFIER &&
        this.parser.peek()!.value === "const"
      ) {
        this.parser.consume(TokenType.IDENTIFIER);
        isConst = true;
      }

      // Check for destructuring: local (a, b) = tuple
      if (this.parser.peek()?.type === TokenType.OPEN_PAREN) {
        return this.parseDestructuringDeclaration(
          scopeToken.value as "global" | "local",
          isConst,
        );
      }

      const varNameToken = this.parser.consume(TokenType.IDENTIFIER);
      this.parser.consume(TokenType.COLON, "Expected ':' after variable name.");

      const typeToken = this.parser.parseType();

      if (this.parser.peek() && this.parser.peek()!.type !== TokenType.ASSIGN) {
        if (isConst) {
          throw new CompilerError(
            `Constant variable '${varNameToken.value}' must be initialized.`,
            varNameToken.line,
          );
        }
        return new VariableDeclarationExpr(
          scopeToken.value as "global" | "local",
          isConst,
          varNameToken.value,
          typeToken,
          null,
          varNameToken,
        );
      }

      this.parser.consume(
        TokenType.ASSIGN,
        "Expected '=' after variable type.",
      );
      const initializer = this.parser.parseTernary();
      return new VariableDeclarationExpr(
        scopeToken.value as "global" | "local",
        isConst,
        varNameToken.value,
        typeToken,
        initializer,
        varNameToken,
      );
    });
  }

  private parseDestructuringDeclaration(
    scope: "global" | "local",
    isConst: boolean,
  ): DestructuringDeclarationExpr {
    const openParen = this.parser.consume(TokenType.OPEN_PAREN);

    // Parse destructuring targets: (a: T1, b: T2) or (a, b)
    const targets: { name: string; type: VariableType | null }[] = [];

    while (this.parser.peek()?.type !== TokenType.CLOSE_PAREN) {
      const nameToken = this.parser.consume(
        TokenType.IDENTIFIER,
        "Expected variable name in destructuring",
      );

      let varType: VariableType | null = null;
      if (this.parser.peek()?.type === TokenType.COLON) {
        this.parser.consume(TokenType.COLON);
        varType = this.parser.parseType();
      }

      targets.push({ name: nameToken.value, type: varType });

      if (this.parser.peek()?.type === TokenType.COMMA) {
        this.parser.consume(TokenType.COMMA);
      } else if (this.parser.peek()?.type !== TokenType.CLOSE_PAREN) {
        throw new CompilerError(
          "Expected ',' or ')' in destructuring pattern",
          this.parser.peek()?.line || 0,
        );
      }
    }

    this.parser.consume(TokenType.CLOSE_PAREN);
    this.parser.consume(
      TokenType.ASSIGN,
      "Expected '=' after destructuring pattern",
    );

    const tupleExpr = this.parser.parseTernary();

    const hasAllTypes = targets.every((t) => t.type !== null);

    if (!hasAllTypes) {
      throw new CompilerError(
        "Type inference in destructuring is not yet supported. Please specify types: local (a: T1, b: T2) = tuple",
        openParen.line,
      );
    }

    // Build the tuple type from target types
    const tupleType: VariableType = {
      name: "tuple",
      isPointer: 0,
      isArray: [],
      tupleElements: targets.map((t) => t.type!),
    };

    // Generate expressions array
    const expressions: Expression[] = [];

    // Create temp variable with explicit tuple type
    // Use a deterministic counter for temp names to ensure reproducibility
    if (!(this.parser as any)._tempCounter) {
      (this.parser as any)._tempCounter = 0;
    }
    const tempId = (this.parser as any)._tempCounter++;
    const tempName = `__tuple_temp_${tempId}`;
    const tempDecl = new VariableDeclarationExpr(
      scope,
      false,
      tempName,
      tupleType,
      tupleExpr,
      openParen,
    );
    expressions.push(tempDecl);

    // Create individual variables: a = __tuple_temp.0, b = __tuple_temp.1
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const tempIdent = new IdentifierExpr(tempName);
      const indexExpr = new NumberLiteralExpr(i.toString(), openParen);
      const memberAccess = new MemberAccessExpr(tempIdent, indexExpr, false);

      const varDecl = new VariableDeclarationExpr(
        scope,
        isConst,
        target?.name ?? "",
        target?.type || { name: "auto", isPointer: 0, isArray: [] },
        memberAccess,
        openParen,
      );
      expressions.push(varDecl);
    }

    const desugaredBlock = new BlockExpr(expressions);
    return new DestructuringDeclarationExpr(
      scope,
      isConst,
      targets,
      tupleExpr,
      desugaredBlock,
      openParen,
    );
  }

  parseFunctionDeclaration(): FunctionDeclarationExpr {
    return this.parser.withRange(() => {
      this.parser.consume(TokenType.IDENTIFIER);
      const funcNameToken = this.parser.consume(TokenType.IDENTIFIER);

      // Parse generic parameters if present
      const genericParams: string[] = [];
      if (this.parser.peek()?.type === TokenType.LESS_THAN) {
        this.parser.consume(TokenType.LESS_THAN);

        do {
          const paramToken = this.parser.consume(
            TokenType.IDENTIFIER,
            "Expected generic parameter name",
          );
          genericParams.push(paramToken.value);

          if (this.parser.peek()?.type === TokenType.COMMA) {
            this.parser.consume(TokenType.COMMA);
          } else if (this.parser.peek()?.type === TokenType.GREATER_THAN) {
            break;
          } else {
            throw new CompilerError(
              "Expected ',' or '>' in generic parameter list",
              this.parser.peek()?.line || 0,
            );
          }
        } while (true);

        this.parser.consume(
          TokenType.GREATER_THAN,
          "Expected '>' after generic parameters",
        );
      }

      const args: { type: VariableType; name: string }[] = [];
      this.parser.consume(
        TokenType.OPEN_PAREN,
        "Expected '(' after 'frame' function name.",
      );

      let isVariadic = false;
      let variadicType: VariableType | null = null;

      while (
        this.parser.peek() &&
        this.parser.peek()!.type !== TokenType.CLOSE_PAREN
      ) {
        if (this.parser.peek()?.type === TokenType.ELLIPSIS) {
          this.parser.consume(TokenType.ELLIPSIS);
          this.parser.consume(TokenType.COLON, "Expected ':' after '...'");
          variadicType = this.parser.parseType();
          isVariadic = true;

          if (this.parser.peek()?.type === TokenType.COMMA) {
            throw new CompilerError(
              "Variadic argument must be the last argument",
              this.parser.peek()?.line || 0,
            );
          }
          break;
        }

        const argNameToken = this.parser.consume(TokenType.IDENTIFIER);
        this.parser.consume(
          TokenType.COLON,
          "Expected ':' after argument name.",
        );

        const argType: VariableType = this.parser.parseType();

        args.push({
          name: argNameToken.value,
          type: argType,
        });

        if (
          this.parser.peek()?.type !== TokenType.CLOSE_PAREN &&
          this.parser.peek()?.type !== TokenType.COMMA &&
          this.parser.peek(1)!.type !== TokenType.CLOSE_PAREN
        ) {
          throw new CompilerError(
            "Expected ',' or ')' after function argument but got '" +
              (this.parser.peek()?.value || "") +
              "'",
            this.parser.peek()?.line || 0,
          );
        }

        if (
          this.parser.peek() &&
          this.parser.peek()!.type === TokenType.COMMA
        ) {
          this.parser.consume(TokenType.COMMA);
        }
      }

      this.parser.consume(
        TokenType.CLOSE_PAREN,
        "Expected ')' after function arguments.",
      );

      let returnType: VariableType | null = null;
      if (
        this.parser.peek() &&
        this.parser.peek()!.type !== TokenType.OPEN_BRACE
      ) {
        const retToken = this.parser.consume(
          TokenType.IDENTIFIER,
          "Expected ret keyword after function arguments.",
        );
        if (retToken.value !== "ret") {
          throw new CompilerError(
            "Expected 'ret' keyword, but got '" + retToken.value + "'",
            retToken.line,
          );
        }
        returnType = this.parser.parseType();
      }

      const body = this.parser.parseCodeBlock();

      return new FunctionDeclarationExpr(
        funcNameToken.value,
        args,
        returnType,
        body,
        funcNameToken,
        isVariadic,
        variadicType,
        genericParams,
      );
    });
  }

  parseStructDeclaration(): StructDeclarationExpr {
    return this.parser.withRange(() => {
      this.parser.consume(TokenType.IDENTIFIER);
      const structNameToken = this.parser.consume(TokenType.IDENTIFIER);

      const genericParams: string[] = [];
      if (this.parser.peek()?.type === TokenType.LESS_THAN) {
        this.parser.consume(TokenType.LESS_THAN);
        while (
          this.parser.peek() &&
          this.parser.peek()!.type !== TokenType.GREATER_THAN
        ) {
          const paramName = this.parser.consume(
            TokenType.IDENTIFIER,
            "Expected generic parameter name.",
          );
          genericParams.push(paramName.value);
          if (this.parser.peek()?.type === TokenType.COMMA) {
            this.parser.consume(TokenType.COMMA);
          }
        }
        this.parser.consume(
          TokenType.GREATER_THAN,
          "Expected '>' after generic parameters.",
        );
      }

      let parent: string | null = null;
      if (this.parser.peek()?.type === TokenType.COLON) {
        this.parser.consume(TokenType.COLON);
        parent = this.parser.consume(
          TokenType.IDENTIFIER,
          "Expected parent struct name.",
        ).value;
      }

      this.parser.consume(
        TokenType.OPEN_BRACE,
        "Expected '{' after struct name.",
      );

      const fields: StructField[] = [];
      while (
        this.parser.peek() &&
        this.parser.peek()!.type !== TokenType.CLOSE_BRACE
      ) {
        // Check if this is a method declaration (starts with 'frame' or 'static')
        if (
          this.parser.peek()?.value === "frame" ||
          this.parser.peek()?.value === "static"
        ) {
          break; // Exit field parsing, start method parsing
        }

        const fieldNameToken = this.parser.consume(TokenType.IDENTIFIER);
        this.parser.consume(TokenType.COLON, "Expected ':' after field name.");

        const fieldTypeToken = this.parser.parseType();

        if (
          this.parser.peek() &&
          this.parser.peek()!.type === TokenType.COMMA
        ) {
          this.parser.consume(TokenType.COMMA);
        }

        fields.push({
          name: fieldNameToken.value,
          type: fieldTypeToken,
          token: fieldNameToken,
        });
      }

      // Parse methods
      const methods: FunctionDeclarationExpr[] = [];
      while (
        this.parser.peek() &&
        (this.parser.peek()?.value === "frame" ||
          this.parser.peek()?.value === "static")
      ) {
        const isStatic = this.parser.peek()?.value === "static";
        const method = this.parseFunctionDeclaration();
        // Tag this as a method with metadata
        method.isMethod = true;
        method.isStatic = isStatic;
        method.receiverStruct = structNameToken.value;
        methods.push(method);
      }

      this.parser.consume(
        TokenType.CLOSE_BRACE,
        "Expected '}' after struct fields.",
      );

      return new StructDeclarationExpr(
        structNameToken.value,
        fields,
        genericParams,
        methods,
        parent,
      );
    });
  }

  parseExternDeclaration(): ExternDeclarationExpr {
    return this.parser.withRange(() => {
      this.parser.consume(TokenType.IDENTIFIER); // consume 'extern'
      const funcNameToken = this.parser.consume(TokenType.IDENTIFIER);
      const args: { type: VariableType; name: string }[] = [];
      this.parser.consume(
        TokenType.OPEN_PAREN,
        "Expected '(' after 'extern' function name.",
      );

      let isVariadic = false;

      while (
        this.parser.peek() &&
        this.parser.peek()!.type !== TokenType.CLOSE_PAREN
      ) {
        if (this.parser.peek()?.type === TokenType.ELLIPSIS) {
          this.parser.consume(TokenType.ELLIPSIS);
          isVariadic = true;
          // Ellipsis must be the last argument
          if (this.parser.peek()?.type === TokenType.COMMA) {
            throw new CompilerError(
              "Variadic argument '...' must be the last argument.",
              this.parser.peek()?.line || 0,
            );
          }
          break;
        }

        const argNameToken = this.parser.consume(TokenType.IDENTIFIER);
        this.parser.consume(
          TokenType.COLON,
          "Expected ':' after argument name.",
        );

        const argType: VariableType = this.parser.parseType();

        args.push({
          name: argNameToken.value,
          type: argType,
        });

        if (
          this.parser.peek()?.type !== TokenType.CLOSE_PAREN &&
          this.parser.peek()?.type !== TokenType.COMMA
        ) {
          throw new CompilerError(
            "Expected ',' or ')' after function argument",
            this.parser.peek()?.line || 0,
          );
        }

        if (
          this.parser.peek() &&
          this.parser.peek()!.type === TokenType.COMMA
        ) {
          this.parser.consume(TokenType.COMMA);
        }
      }

      this.parser.consume(
        TokenType.CLOSE_PAREN,
        "Expected ')' after function arguments.",
      );

      let returnType: VariableType | null = null;
      if (
        this.parser.peek() &&
        this.parser.peek()!.type !== TokenType.SEMICOLON
      ) {
        const retToken = this.parser.consume(
          TokenType.IDENTIFIER,
          "Expected ret keyword or semicolon after function arguments.",
        );
        if (retToken.value === "ret") {
          returnType = this.parser.parseType();
        } else {
          throw new CompilerError(
            "Expected 'ret' keyword, but got '" + retToken.value + "'",
            retToken.line,
          );
        }
      }

      return new ExternDeclarationExpr(
        funcNameToken.value,
        args,
        returnType,
        isVariadic,
      );
    });
  }

  parseImportExpression(): ImportExpr {
    return this.parser.withRange(() => {
      this.parser.consume(TokenType.IDENTIFIER);
      const importNames: {
        name: string;
        type: "type" | "function";
        token?: Token;
      }[] = [];

      while (
        (this.parser.peek()?.type === TokenType.IDENTIFIER ||
          this.parser.peek()?.type === TokenType.OPEN_BRACKET) &&
        this.parser.peek()?.value !== "from"
      ) {
        if (this.parser.peek()?.type === TokenType.OPEN_BRACKET) {
          this.parser.consume(TokenType.OPEN_BRACKET);
          const importNameToken = this.parser.consume(TokenType.IDENTIFIER);
          this.parser.consume(TokenType.CLOSE_BRACKET);
          importNames.push({
            name: importNameToken.value,
            type: "type",
            token: importNameToken,
          });
        } else {
          const importNameToken = this.parser.consume(TokenType.IDENTIFIER);
          importNames.push({
            name: importNameToken.value,
            type: "function",
            token: importNameToken,
          });
        }
        if (this.parser.peek()?.type === TokenType.COMMA) {
          this.parser.consume(TokenType.COMMA);
        } else if (
          this.parser.peek()?.type === TokenType.IDENTIFIER &&
          this.parser.peek()?.value !== "from"
        ) {
          throw new CompilerError(
            "Expected ',' between imports",
            this.parser.peek()?.line || 0,
          );
        }
      }

      if (importNames.length === 0) {
        throw new CompilerError(
          "Expected at least one import name after 'import'",
          this.parser.peek(-1)?.line || 0,
        );
      }

      let moduleNameToken: Token | null = null;
      if (this.parser.peek()?.value === "from") {
        this.parser.consume(TokenType.IDENTIFIER); // consume 'from'
        const nextToken = this.parser.peek(); // check next token for module name, can be identifier or string literal
        if (
          !nextToken ||
          (nextToken?.type !== TokenType.IDENTIFIER &&
            nextToken.type !== TokenType.STRING_LITERAL)
        ) {
          throw new CompilerError(
            "Expected module name after 'from'",
            this.parser.peek(-1)?.line || 0,
          );
        }
        moduleNameToken = this.parser.consume(nextToken!.type);
      }

      return new ImportExpr(
        moduleNameToken?.value ?? "global",
        importNames,
        moduleNameToken ?? undefined,
      );
    });
  }

  parseExportExpression(): ExportExpr {
    return this.parser.withRange(() => {
      this.parser.consume(TokenType.IDENTIFIER);
      let exportType: "type" | "function" = "function";
      if (this.parser.peek()?.type === TokenType.OPEN_BRACKET) {
        this.parser.consume(TokenType.OPEN_BRACKET);
        exportType = "type";
      }
      const name = this.parser.consume(TokenType.IDENTIFIER);
      if (exportType === "type") {
        this.parser.consume(
          TokenType.CLOSE_BRACKET,
          "Expected ']' after export type.",
        );
      }
      return new ExportExpr(name.value, exportType, name);
    });
  }
}
