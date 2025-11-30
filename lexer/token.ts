import TokenType from "./tokenType";

export default class Token {
  constructor(
    type: TokenType,
    value: string,
    line: number,
    column: number,
    start: number = 0,
    raw: string = "",
  ) {
    this.type = type;
    this.value = value;
    this.line = line;
    this.column = column;
    this.start = start;
    this.raw = raw || value;
  }
  type: TokenType;
  value: string;
  line: number;
  column: number;
  start: number;
  raw: string;

  toString(): string {
    return `Token([${this.type}], "${this.value}" @${this.line}:${this.column})`;
  }
}
