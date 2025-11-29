import TokenType from "./tokenType";

export default class Token {
  constructor(type: TokenType, value: string, line: number, column: number) {
    this.type = type;
    this.value = value;
    this.line = line;
    this.column = column;
  }
  type: TokenType;
  value: string;
  line: number;
  column: number;

  toString(): string {
    return `Token([${this.type}], "${this.value}" @${this.line}:${this.column})`;
  }
}
