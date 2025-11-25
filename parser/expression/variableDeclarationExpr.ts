import type AsmGenerator from "../../transpiler/AsmGenerator";
import type Scope from "../../transpiler/Scope";
import ExpressionType from "../expressionType";
import ArrayLiteralExpr from "./arrayLiteralExpr";
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
      this.parseGlobalVariableDeclaration(gen, scope);
      return;
    }

    if (this.scope !== "local") {
      throw new Error("Invalid variable scope: " + this.scope);
    }

    if (this.value === null && this.isConst) {
      throw new Error("Const local variable must be initialized");
    }

    const totalBytes = this.varType.isArray.length
      ? 8 * this.varType.isArray.reduce((a, b) => a * b, 1)
      : 8;
    const offset = scope.allocLocal(totalBytes);
    gen.emit("sub rsp, " + totalBytes, "Allocate space for local variable");

    scope.define(this.name, {
      offset: offset.toString(),
      type: "local",
      varType: this.varType,
    });

    if (this.value && this.varType.isArray.length) {
      if (!(this.value instanceof ArrayLiteralExpr)) {
        throw new Error(
          "Local array variable must be initialized with an array literal",
        );
      }

      this.value.transpile(gen, scope);
      (this.value as ArrayLiteralExpr).elements.forEach((_, index) => {
        gen.emit("pop rbx", "Load array element");
        scope.stackOffset -= 8;
        gen.emit(
          `mov [ rbp - ${offset} + ${index} * 8 ], rbx`,
          `Initialize local array variable ${this.name}[${index}]`,
        );
      });
    } else if (this.value) {
      this.value.transpile(gen, scope);
      gen.emit(
        `mov [ rbp - ${offset} ], rax`,
        "Initialize local variable " + this.name,
      );
    } else if (!this.value && !this.varType.isArray.length) {
      gen.emit(
        `mov qword [ rbp - ${offset} ], 0`,
        "Uninitialized local variable",
      );
    } else if (!this.value && this.varType.isArray.length) {
      gen.emit("xor rax, rax", "Zero value for array initialization");
      gen.emit(`mov rcx, ${totalBytes}`, "Array initialization loop counter");
      gen.emit(`lea rdi, [ rbp - ${offset} ]`, "Array start address");
      gen.emit("rep stosq", "Initialize local array variable to zero");
    }
  }

  private parseGlobalVariableDeclaration(
    gen: AsmGenerator,
    scope: Scope,
  ): void {
    if (scope.parent !== null) {
      throw new Error(
        "Global variable declaration should be in the global scope",
      );
    }

    if (this.value === null && this.isConst) {
      throw new Error("Const global variable must be initialized");
    }

    const label = gen.generateLabel("global_var_" + this.name);
    scope.define(this.name, {
      offset: label,
      type: "global",
      varType: this.varType,
    });

    if (!this.value && !this.varType.isArray.length) {
      gen.emitBss(label, "resq", 1);
      gen.startPrecomputeBlock();
      gen.emit(
        "mov qword [ rel " + label + " ], 0",
        "Uninitialized global variable",
      );
      gen.endPrecomputeBlock();
    } else if (!this.value && this.varType.isArray.length) {
      const arraySize = this.varType.isArray.reduce((a, b) => a * b, 1) || 1;
      gen.emitBss(label, "resq", arraySize);
    } else if (this.value && this.varType.isArray.length) {
      const arraySize = this.varType.isArray.reduce((a, b) => a * b, 1) || 1;
      gen.emitBss(label, "resq", arraySize);
      if (!(this.value instanceof ArrayLiteralExpr)) {
        throw new Error(
          "Global array variable must be initialized with an array literal",
        );
      }
      gen.startPrecomputeBlock();
      this.value!.transpile(gen, scope);
      (this.value as ArrayLiteralExpr).elements.forEach((_, index) => {
        gen.emit("pop rbx", "Load array element");
        scope.stackOffset -= 8;
        gen.emit(
          `mov [ rel ${label} + ${index} * 8 ], rbx`,
          `Initialize global array variable ${this.name}[${index}]`,
        );
      });
      gen.endPrecomputeBlock();
    } else {
      gen.emitBss(label, "resq", 1);
      gen.startPrecomputeBlock();
      this.value!.transpile(gen, scope);
      gen.emit(
        "mov [ rel " + label + " ], rax",
        "Initialize global variable " + this.name,
      );
      gen.endPrecomputeBlock();
    }
  }
}
