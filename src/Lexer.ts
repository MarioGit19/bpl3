import { Token } from "./Token";
import { TokenType } from "./TokenType";

export class Lexer {
  private source: string;
  private tokens: Token[] = [];
  private start: number = 0;
  private current: number = 0;
  private line: number = 1;
  private column: number = 1;
  private startColumn: number = 1;
  private filePath: string;

  private static keywords: Record<string, TokenType> = {
    global: TokenType.Global,
    local: TokenType.Local,
    const: TokenType.Const,
    type: TokenType.Type,
    frame: TokenType.Frame,
    ret: TokenType.Ret,
    struct: TokenType.Struct,
    import: TokenType.Import,
    from: TokenType.From,
    export: TokenType.Export,
    extern: TokenType.Extern,
    asm: TokenType.Asm,
    loop: TokenType.Loop,
    if: TokenType.If,
    else: TokenType.Else,
    break: TokenType.Break,
    continue: TokenType.Continue,
    try: TokenType.Try,
    catch: TokenType.Catch,
    catchOther: TokenType.CatchOther,
    return: TokenType.Return,
    throw: TokenType.Throw,
    switch: TokenType.Switch,
    case: TokenType.Case,
    default: TokenType.Default,
    cast: TokenType.Cast,
    sizeof: TokenType.Sizeof,
    match: TokenType.Match,
    null: TokenType.Null,
    nullptr: TokenType.Nullptr,
    true: TokenType.True,
    false: TokenType.False,
  };

  constructor(source: string, filePath: string) {
    this.source = source;
    this.filePath = filePath;
  }

  public scanTokens(): Token[] {
    while (!this.isAtEnd()) {
      this.start = this.current;
      this.startColumn = this.column;
      this.scanToken();
    }

    this.tokens.push(
      new Token(TokenType.EOF, "", null, this.line, this.column, this.filePath),
    );
    return this.tokens;
  }

  private scanToken(): void {
    const c = this.advance();
    switch (c) {
      case "(":
        this.addToken(TokenType.LeftParen);
        break;
      case ")":
        this.addToken(TokenType.RightParen);
        break;
      case "{":
        this.addToken(TokenType.LeftBrace);
        break;
      case "}":
        this.addToken(TokenType.RightBrace);
        break;
      case "[":
        this.addToken(TokenType.LeftBracket);
        break;
      case "]":
        this.addToken(TokenType.RightBracket);
        break;
      case ",":
        this.addToken(TokenType.Comma);
        break;
      case ";":
        this.addToken(TokenType.Semicolon);
        break;
      case ":":
        this.addToken(TokenType.Colon);
        break;
      case "?":
        this.addToken(TokenType.Question);
        break;
      case "~":
        this.addToken(TokenType.Tilde);
        break;

      case ".":
        if (this.match(".") && this.match(".")) {
          this.addToken(TokenType.Ellipsis);
        } else {
          this.addToken(TokenType.Dot);
        }
        break;

      case "!":
        this.addToken(this.match("=") ? TokenType.BangEqual : TokenType.Bang);
        break;
      case "=":
        this.addToken(this.match("=") ? TokenType.EqualEqual : TokenType.Equal);
        break;
      case "<":
        if (this.match("=")) {
          this.addToken(TokenType.LessEqual);
        } else if (this.match("<")) {
          this.addToken(TokenType.LessLess);
        } else {
          this.addToken(TokenType.Less);
        }
        break;
      case ">":
        if (this.match("=")) {
          this.addToken(TokenType.GreaterEqual);
        } else {
          // We treat '>>' as two '>' tokens to support nested generics like Box<Box<int>>
          // The parser will handle '>>' as a shift operator if needed by checking for adjacent tokens
          // But wait, if we do this, 'a >> b' becomes 'a > > b'.
          // The parser needs to be smart enough to combine them OR we keep it as GreaterGreater
          // and the parser splits it when parsing types.
          // Splitting in parser is safer for existing code.
          // Let's try to keep GreaterGreater here but handle it in Parser.
          if (this.match(">")) {
            this.addToken(TokenType.GreaterGreater);
          } else {
            this.addToken(TokenType.Greater);
          }
        }
        break;
      case "+":
        if (this.match("=")) {
          this.addToken(TokenType.PlusEqual);
        } else if (this.match("+")) {
          this.addToken(TokenType.PlusPlus);
        } else {
          this.addToken(TokenType.Plus);
        }
        break;
      case "-":
        if (this.match("=")) {
          this.addToken(TokenType.MinusEqual);
        } else if (this.match("-")) {
          this.addToken(TokenType.MinusMinus);
        } else {
          this.addToken(TokenType.Minus);
        }
        break;
      case "*":
        this.addToken(this.match("=") ? TokenType.StarEqual : TokenType.Star);
        break;
      case "/":
        if (this.match("/")) {
          // A comment goes until the end of the line.
          while (this.peek() != "\n" && !this.isAtEnd()) this.advance();
        } else if (this.match("=")) {
          this.addToken(TokenType.SlashEqual);
        } else {
          this.addToken(TokenType.Slash);
        }
        break;
      case "%":
        this.addToken(
          this.match("=") ? TokenType.PercentEqual : TokenType.Percent,
        );
        break;
      case "&":
        if (this.match("=")) {
          this.addToken(TokenType.AmpersandEqual);
        } else if (this.match("&")) {
          this.addToken(TokenType.AndAnd);
        } else {
          this.addToken(TokenType.Ampersand);
        }
        break;
      case "|":
        if (this.match("=")) {
          this.addToken(TokenType.PipeEqual);
        } else if (this.match("|")) {
          this.addToken(TokenType.OrOr);
        } else {
          this.addToken(TokenType.Pipe);
        }
        break;
      case "^":
        this.addToken(this.match("=") ? TokenType.CaretEqual : TokenType.Caret);
        break;

      case "#":
        if (this.match("#") && this.match("#")) {
          // Multi-line comment
          this.multiLineComment();
        } else {
          // Single-line comment
          while (this.peek() != "\n" && !this.isAtEnd()) this.advance();
        }
        break;

      case " ":
      case "\r":
      case "\t":
        // Ignore whitespace
        break;

      case "\n":
        this.line++;
        this.column = 1;
        break;

      case '"':
        this.string();
        break;
      case "'":
        this.char();
        break;

      default:
        if (this.isDigit(c)) {
          this.number();
        } else if (this.isAlpha(c)) {
          this.identifier();
        } else {
          console.error(
            `Unexpected character: ${c} at line ${this.line}, col ${this.column}`,
          );
        }
        break;
    }
  }

  private multiLineComment(): void {
    while (!this.isAtEnd()) {
      if (
        this.peek() === "#" &&
        this.peekNext() === "#" &&
        this.peekNextNext() === "#"
      ) {
        this.advance();
        this.advance();
        this.advance();
        return;
      }
      if (this.peek() === "\n") {
        this.line++;
        this.column = 1;
      }
      this.advance();
    }
    console.error("Unterminated multi-line comment.");
  }

  private identifier(): void {
    while (this.isAlphaNumeric(this.peek())) this.advance();

    const text = this.source.substring(this.start, this.current);
    let type = Lexer.keywords[text];
    if (type === undefined) type = TokenType.Identifier;
    this.addToken(type);
  }

  private number(): void {
    // Hex
    if (this.peekPrevious() === "0" && this.peek() === "x") {
      this.advance(); // Consume 'x'
      while (this.isHexDigit(this.peek())) this.advance();
      this.addToken(
        TokenType.NumberLiteral,
        this.source.substring(this.start, this.current),
      );
      return;
    }
    // Binary
    if (this.peekPrevious() === "0" && this.peek() === "b") {
      this.advance(); // Consume 'b'
      while (this.isBinaryDigit(this.peek())) this.advance();
      this.addToken(
        TokenType.NumberLiteral,
        this.source.substring(this.start, this.current),
      );
      return;
    }
    // Octal
    if (this.peekPrevious() === "0" && this.peek() === "o") {
      this.advance(); // Consume 'o'
      while (this.isOctalDigit(this.peek())) this.advance();
      this.addToken(
        TokenType.NumberLiteral,
        this.source.substring(this.start, this.current),
      );
      return;
    }

    // Decimal / Float
    while (this.isDigit(this.peek()) || this.peek() === "_") this.advance();

    if (this.peek() === "." && this.isDigit(this.peekNext())) {
      this.advance(); // Consume '.'
      while (this.isDigit(this.peek()) || this.peek() === "_") this.advance();
    }

    this.addToken(
      TokenType.NumberLiteral,
      parseFloat(
        this.source.substring(this.start, this.current).replace(/_/g, ""),
      ),
    );
  }

  private string(): void {
    let value = "";
    while (this.peek() != '"' && !this.isAtEnd()) {
      if (this.peek() == "\n") {
        this.line++;
        this.column = 1;
      }
      if (this.peek() == "\\") {
        this.advance(); // Consume backslash
        switch (this.peek()) {
          case "n":
            value += "\n";
            break;
          case "t":
            value += "\t";
            break;
          case "r":
            value += "\r";
            break;
          case '"':
            value += '"';
            break;
          case "\\":
            value += "\\";
            break;
          case "0":
            value += "\0";
            break;
          default:
            value += this.peek();
            break;
        }
        this.advance(); // Consume escaped char
      } else {
        value += this.advance();
      }
    }

    if (this.isAtEnd()) {
      console.error("Unterminated string.");
      return;
    }

    this.advance(); // The closing "

    this.addToken(TokenType.StringLiteral, value);
  }

  private char(): void {
    if (this.peek() == "\\") this.advance();
    this.advance();

    if (this.peek() == "'") {
      this.advance();
      const value = this.source.substring(this.start + 1, this.current - 1);
      this.addToken(TokenType.CharLiteral, value);
    } else {
      console.error("Unterminated char literal.");
    }
  }

  private match(expected: string): boolean {
    if (this.isAtEnd()) return false;
    if (this.source.charAt(this.current) != expected) return false;

    this.current++;
    this.column++;
    return true;
  }

  private peek(): string {
    if (this.isAtEnd()) return "\0";
    return this.source.charAt(this.current);
  }

  private peekNext(): string {
    if (this.current + 1 >= this.source.length) return "\0";
    return this.source.charAt(this.current + 1);
  }

  private peekNextNext(): string {
    if (this.current + 2 >= this.source.length) return "\0";
    return this.source.charAt(this.current + 2);
  }

  private peekPrevious(): string {
    if (this.current - 1 < 0) return "\0";
    return this.source.charAt(this.current - 1);
  }

  private isAlpha(c: string): boolean {
    return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c == "_";
  }

  private isDigit(c: string): boolean {
    return c >= "0" && c <= "9";
  }

  private isHexDigit(c: string): boolean {
    return this.isDigit(c) || (c >= "a" && c <= "f") || (c >= "A" && c <= "F");
  }

  private isBinaryDigit(c: string): boolean {
    return c == "0" || c == "1";
  }

  private isOctalDigit(c: string): boolean {
    return c >= "0" && c <= "7";
  }

  private isAlphaNumeric(c: string): boolean {
    return this.isAlpha(c) || this.isDigit(c);
  }

  private isAtEnd(): boolean {
    return this.current >= this.source.length;
  }

  private advance(): string {
    this.column++;
    return this.source.charAt(this.current++);
  }

  private addToken(type: TokenType, literal: any = null): void {
    const text = this.source.substring(this.start, this.current);
    this.tokens.push(
      new Token(
        type,
        text,
        literal,
        this.line,
        this.startColumn,
        this.filePath,
      ),
    );
  }
}
