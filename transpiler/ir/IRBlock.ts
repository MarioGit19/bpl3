import { IRInstruction } from "./IRInstruction";

export class IRBlock {
  public instructions: IRInstruction[] = [];

  constructor(public name: string) {}

  add(inst: IRInstruction) {
    this.instructions.push(inst);
  }

  toString(): string {
    return (
      `${this.name}:\n` +
      this.instructions.map((i) => "  " + i.toString()).join("\n")
    );
  }
}
