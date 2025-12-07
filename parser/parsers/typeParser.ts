import { CompilerError } from "../../errors";
import TokenType from "../../lexer/tokenType";
import { ParserBase } from "../parserBase";

import type { VariableType } from "../expression/variableDeclarationExpr";

export class TypeParser {
  constructor(private parser: ParserBase) {}

  public parse(): VariableType {
    // Handle pointers first
    let pointerCount = 0;
    while (this.parser.peek()?.type === TokenType.STAR) {
      this.parser.consume(TokenType.STAR);
      pointerCount++;
    }

    // Check for tuple type: (T1, T2, ...)
    if (this.parser.peek()?.type === TokenType.OPEN_PAREN) {
      const tupleType = this.parseTupleType();
      tupleType.isPointer = pointerCount;
      return tupleType;
    }

    const typeInfo: VariableType = {
      name: "",
      isPointer: pointerCount,
      isArray: [],
    };

    const typeName = this.parser.consume(
      TokenType.IDENTIFIER,
      "Expected type name.",
    );
    typeInfo.name = typeName.value;
    typeInfo.token = typeName;

    if (this.parser.peek()?.type === TokenType.LESS_THAN) {
      this.parser.consume(TokenType.LESS_THAN);
      typeInfo.genericArgs = [];
      while (
        this.parser.peek() &&
        this.parser.peek()!.type !== TokenType.GREATER_THAN &&
        this.parser.peek()!.type !== TokenType.BITSHIFT_RIGHT
      ) {
        typeInfo.genericArgs.push(this.parse());
        if (this.parser.peek()?.type === TokenType.COMMA) {
          this.parser.consume(TokenType.COMMA);
        }
      }

      if (this.parser.peek()?.type === TokenType.BITSHIFT_RIGHT) {
        this.parser.splitBitshiftRight();
      }

      this.parser.consume(
        TokenType.GREATER_THAN,
        "Expected '>' after generic arguments.",
      );
    }

    while (this.parser.peek()?.type === TokenType.OPEN_BRACKET) {
      this.parser.consume(TokenType.OPEN_BRACKET);
      let size = 0;
      if (this.parser.peek()?.type === TokenType.NUMBER_LITERAL) {
        const sizeToken = this.parser.consume(TokenType.NUMBER_LITERAL);
        size = Number(sizeToken.value);
      } else if (this.parser.peek()?.type === TokenType.CLOSE_BRACKET) {
        throw new CompilerError(
          "Array size must be specified as a number literal or numeric expression.",
          this.parser.peek()?.line || 0,
        );
      }

      this.parser.consume(
        TokenType.CLOSE_BRACKET,
        "Expected ']' after array brackets.",
      );
      typeInfo.isArray.push(size);
    }

    return typeInfo;
  }

  private parseTupleType(): VariableType {
    const openParen = this.parser.consume(TokenType.OPEN_PAREN);
    const tupleElements: VariableType[] = [];

    // Parse first element
    if (this.parser.peek()?.type === TokenType.CLOSE_PAREN) {
      throw new CompilerError("Empty tuples are not supported", openParen.line);
    }

    tupleElements.push(this.parse());

    // Check for comma (distinguishes tuple from grouping)
    if (this.parser.peek()?.type !== TokenType.COMMA) {
      // Single element without comma - could be (T) or error
      if (this.parser.peek()?.type === TokenType.CLOSE_PAREN) {
        // For now, treat (T) as grouping, not single-element tuple
        // User must use (T,) for single-element tuples
        this.parser.consume(TokenType.CLOSE_PAREN);
        return tupleElements[0]!;
      }
      throw new CompilerError(
        "Expected ',' or ')' in tuple type",
        this.parser.peek()?.line || 0,
      );
    }

    // Parse remaining elements
    while (this.parser.peek()?.type === TokenType.COMMA) {
      this.parser.consume(TokenType.COMMA);

      // Allow trailing comma: (T1, T2,)
      if (this.parser.peek()?.type === TokenType.CLOSE_PAREN) {
        break;
      }

      tupleElements.push(this.parse());
    }

    this.parser.consume(
      TokenType.CLOSE_PAREN,
      "Expected ')' after tuple type elements",
    );

    return {
      name: "tuple",
      isPointer: 0,
      isArray: [],
      tupleElements,
      token: openParen,
    };
  }
}
