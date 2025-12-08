import { Grammar } from "./types";
import ProgramExpr from "../parser/expression/programExpr";

export class GenericParser {
  private grammar: Grammar;
  private input: string;

  constructor(grammar: Grammar, input: string) {
    this.grammar = grammar;
    this.input = input;
  }

  public parse(): ProgramExpr {
    // Placeholder for generic parsing logic
    throw new Error("Not implemented");
  }
}
