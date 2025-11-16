import ExpressionType from "../expressionType";
import Expression from "./expr";

export default class EOFExpr extends Expression {
  constructor() {
    super(ExpressionType.EOF);
    this.requiresSemicolon = false;
  }

  toString(depth: number = 0): string {
    this.depth = depth;
    return this.getDepth() + "<EOF>\n";
  }

  log(depth: number = 0): void {
    console.log(this.toString(depth));
  }

  transpile(): string {
    return "";
  }
}
