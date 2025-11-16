import ExpressionType from "../expressionType";

export default class Expression {
  constructor(type: ExpressionType) {
    this.type = type;
  }
  public type: ExpressionType;
  public depth: number = 0;

  toString(depth: number = 0): string {
    throw new Error("Method not implemented.");
  }

  log(depth: number = 0): void {
    throw new Error("Method not implemented.");
  }

  transpile(): string {
    throw new Error("Method not implemented.");
  }

  getDepth(): string {
    return " ".repeat(this.depth * 2);
  }
}
