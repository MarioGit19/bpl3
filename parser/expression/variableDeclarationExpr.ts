import type AsmGenerator from "../../transpiler/AsmGenerator";
import type Scope from "../../transpiler/Scope";
import ExpressionType from "../expressionType";
import Expression from "./expr";

export type VariableType = {
  name: string;
  isPointer: number;
  isArray: number[];
};

export default class VariableDeclarationExpr extends Expression {
  constructor(
    public scope: "global" | "local",
    public isConst: boolean,
    public name: string,
    public varType: VariableType,
    public value: Expression | null,
  ) {
    super(ExpressionType.VariableDeclaration);
  }

  toString(depth: number = 0): string {
    this.depth = depth;
    let output = this.getDepth();
    output += "[ VariableDeclaration ]\n";
    this.depth++;
    output += this.getDepth();
    output += `Scope: ${this.scope}\n`;
    output += this.getDepth();
    output += `IsConst: ${this.isConst}\n`;
    output += this.getDepth();
    output += `Name: ${this.name}\n`;
    output += this.getDepth();
    output += this.printType(this.varType);
    if (this.value) {
      output += this.getDepth();
      output += `Value:\n`;
      output += this.value.toString(this.depth + 1);
    } else {
      output += this.getDepth();
      output += `Value: uninitialized\n`;
    }
    this.depth--;
    output += this.getDepth();
    output += "/[ VariableDeclaration ]\n";
    return output;
  }

  log(depth: number = 0): void {
    console.log(this.toString(depth));
  }

  transpile(gen: AsmGenerator, scope: Scope): void {
    if (this.scope === "global") {
      const label = gen.generateLabel(
        "global_" + (this.isConst ? "const_" : "") + this.name,
      );
      gen.emitData(label, 0);
      if (this.value) {
        gen.startPrecomputeBlock();
        this.value.transpile(gen, scope);
        gen.emit(
          `mov [rel ${label}], rax`,
          "initialize global variable " + this.name,
        );
        gen.endPrecomputeBlock();
        scope.define(this.name, {
          type: "global",
          label: label,
        });
      } else {
        gen.startPrecomputeBlock();
        gen.emit(
          `mov qword [${label}], 0`,
          "initialize global variable " + this.name + " to 0",
        );
        gen.endPrecomputeBlock();
        scope.define(this.name, {
          type: "global",
          label: label,
        });
      }
    } else {
      const allocSize = this.varType.isArray.length
        ? Number(this.varType.isArray[0]) * 8
        : 8;
      const offset = scope.allocLocal(allocSize);
      gen.emit(
        `sub rsp, ${allocSize}`,
        "allocate space for local variable " + this.name,
      );
      scope.define(this.name, { type: "local", offset: offset });
      if (this.value) {
        this.value.transpile(gen, scope);
        gen.emit(
          `mov [rbp - ${offset}], rax`,
          "initialize local variable " + this.name,
        );
      } else {
        if (this.varType.isArray.length) {
          // 1. Load the starting address (the low end of the array) into RDI
          gen.emit(
            `lea rdi, [rbp - ${offset}]`,
            "load address of array " + this.name + " into RDI",
          );
          // 2. Set the value to write (AL/RAX) to zero
          gen.emit(
            `xor rax, rax`,
            "set RAX to 0 for initializing array " + this.name,
          );
          // 3. Set the counter: 5 QWORD elements
          gen.emit(
            `mov rcx, ${Number(this.varType.isArray[0])}`,
            "set RCX to array size for " + this.name,
          );
          // 4. Repeat Store QWORD: Write RAX into [RDI], then increment RDI, RCX--
          gen.emit(`rep stosq`, "initialize array " + this.name + " to 0");
        } else {
          gen.emit(
            `mov qword [rbp - ${offset}], 0`,
            "initialize local variable " + this.name + " to 0",
          );
        }
      }
    }
  }
}
