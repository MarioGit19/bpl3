import TokenType from "./tokenType";

export default class Token {
  constructor(type: TokenType, value: string, line: number) {
    this.type = type;
    this.value = value;
    this.line = line;
  }
  type: TokenType;
  value: string;
  line: number;

  toString(): string {
    return `Token([${this.type}], "${this.value}" @${this.line})`;
  }
}
