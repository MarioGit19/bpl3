import type { Grammar } from "./types";
import type { Program } from "../compiler/common/AST";

export class GenericParser {
  private grammar: Grammar;
  private input: string;

  constructor(grammar: Grammar, input: string) {
    this.grammar = grammar;
    this.input = input;
  }

  public parse(): Program {
    // Placeholder for generic parsing logic
    throw new Error("Not implemented");
  }
}
