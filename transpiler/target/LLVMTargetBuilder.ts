import type { TargetBuilder } from "./TargetBuilder";
import { IRFunction } from "../ir/IRFunction";
import {
  AllocaInst,
  BinaryInst,
  BranchInst,
  CallInst,
  CastInst,
  CondBranchInst,
  GetElementPtrInst,
  InlineAsmInst,
  IRInstruction,
  IROpcode,
  LoadInst,
  ReturnInst,
  StoreInst,
  SwitchInst,
} from "../ir/IRInstruction";
import { IRModule } from "../ir/IRModule";

import { type IRType, irTypeToString } from "../ir/IRType";
import { Logger } from "../../utils/Logger";

export class LLVMTargetBuilder implements TargetBuilder {
  constructor(private enableStackTrace: boolean = false) {}

  build(module: IRModule): string {
    let output = "";

    if (this.enableStackTrace) {
      output += `%StackFrame = type { ptr, ptr, ptr, i32 }\n`;
      output += `@__stack_top = linkonce_odr global ptr null, align 8\n`;
      output += `@__stack_trace_fmt = private unnamed_addr constant [16 x i8] c"\\09at %s (%s:%d)\\0A\\00", align 1\n\n`;

      output += `define linkonce_odr ptr @__get_stack_top() {
  %curr = load ptr, ptr @__stack_top
  ret ptr %curr
}\n\n`;

      output += `define linkonce_odr void @__print_stack_trace() {
entry:
  %curr = load ptr, ptr @__stack_top
  %cmp = icmp eq ptr %curr, null
  br i1 %cmp, label %end, label %loop

loop:
  %frame = phi ptr [ %curr, %entry ], [ %prev, %loop ]
  %funcNamePtr = getelementptr inbounds %StackFrame, ptr %frame, i32 0, i32 1
  %funcName = load ptr, ptr %funcNamePtr
  %fileNamePtr = getelementptr inbounds %StackFrame, ptr %frame, i32 0, i32 2
  %fileName = load ptr, ptr %fileNamePtr
  %linePtr = getelementptr inbounds %StackFrame, ptr %frame, i32 0, i32 3
  %line = load i32, ptr %linePtr
  
  %fmt = getelementptr inbounds [16 x i8], ptr @__stack_trace_fmt, i64 0, i64 0
  call i32 (ptr, ...) @printf(ptr %fmt, ptr %funcName, ptr %fileName, i32 %line)
  
  %prevPtr = getelementptr inbounds %StackFrame, ptr %frame, i32 0, i32 0
  %prev = load ptr, ptr %prevPtr
  %cmpLoop = icmp eq ptr %prev, null
  br i1 %cmpLoop, label %end, label %loop

end:
  ret void
}\n\n`;
    }

    for (const s of module.structs) {
      const fields = s.fields.map((f) => this.typeToString(f)).join(", ");
      output += `%${this.formatName(s.name)} = type { ${fields} }\n`;
    }
    output += "\n";

    for (const global of module.globals) {
      if (global.value !== undefined) {
        if (
          global.type.type === "array" &&
          global.type.base &&
          global.type.base.type === "i8"
        ) {
          output += `${global.name} = private unnamed_addr constant ${this.typeToString(global.type)} c"${this.escapeString(global.value)}\\00", align 1\n`;
        } else {
          const linkage = global.linkage ? `${global.linkage} ` : "";
          output += `${global.name} = ${linkage}global ${this.typeToString(global.type)} ${global.value}, align 8\n`;
        }
      } else {
        const linkage = global.linkage ? `${global.linkage} ` : "";
        output += `${global.name} = ${linkage}global ${this.typeToString(global.type)} zeroinitializer, align 8\n`;
      }
    }

    output += "\n";

    for (const func of module.functions) {
      if (
        this.enableStackTrace &&
        (func.name === "__print_stack_trace" || func.name === "__get_stack_top")
      ) {
        continue;
      }
      output += this.buildFunction(func) + "\n";
    }

    return output;
  }

  private buildFunction(func: IRFunction): string {
    const args = func.args
      .map((a) => `${this.typeToString(a.type)} %${a.name}`)
      .join(", ");
    const ret = this.typeToString(func.returnType);

    const signatureArgs = func.isVariadic
      ? args
        ? args + ", ..."
        : "..."
      : args;

    if (func.blocks.length === 0) {
      return `declare ${ret} @${func.name}(${signatureArgs})`;
    }

    let output = `define ${ret} @${func.name}(${signatureArgs}) {\n`;

    for (const block of func.blocks) {
      if (!block) continue;
      if (typeof block.name === "undefined") {
        Logger.error("Block name is undefined:", JSON.stringify(block));
        continue;
      }
      output += `${block.name.replace("%", "")}:\n`;
      for (const inst of block.instructions) {
        output += `  ${this.buildInstruction(inst)}\n`;
      }
    }

    output += "}\n";
    return output;
  }

  private buildInstruction(inst: IRInstruction): string {
    switch (inst.opcode) {
      case IROpcode.ADD:
      case IROpcode.SUB:
      case IROpcode.MUL:
      case IROpcode.DIV:
      case IROpcode.UDIV:
      case IROpcode.MOD:
      case IROpcode.UMOD:
      case IROpcode.AND:
      case IROpcode.OR:
      case IROpcode.XOR:
      case IROpcode.SHL:
      case IROpcode.SHR:
      case IROpcode.EQ:
      case IROpcode.NE:
      case IROpcode.LT:
      case IROpcode.GT:
      case IROpcode.LE:
      case IROpcode.GE:
      case IROpcode.ULT:
      case IROpcode.UGT:
      case IROpcode.ULE:
      case IROpcode.UGE:
      case IROpcode.FADD:
      case IROpcode.FSUB:
      case IROpcode.FMUL:
      case IROpcode.FDIV:
      case IROpcode.FMOD:
      case IROpcode.FOEQ:
      case IROpcode.FONE:
      case IROpcode.FOLT:
      case IROpcode.FOGT:
      case IROpcode.FOLE:
      case IROpcode.FOGE:
        return this.buildBinary(inst as BinaryInst);
      case IROpcode.ALLOCA: {
        const i = inst as AllocaInst;
        return `${i.dest} = alloca ${this.typeToString(i.type)}`;
      }
      case IROpcode.LOAD: {
        const i = inst as LoadInst;
        return `${i.dest} = load ${this.typeToString(i.type)}, ptr ${i.ptr}`;
      }
      case IROpcode.STORE: {
        const i = inst as StoreInst;
        return `store ${this.typeToString(i.type)} ${i.value}, ptr ${i.ptr}`;
      }
      case IROpcode.CALL: {
        const i = inst as CallInst;
        const dest = i.dest ? `${i.dest} = ` : "";
        const args = i.args
          .map((a) => `${this.typeToString(a.type)} ${a.value}`)
          .join(", ");
        const name = i.funcName.startsWith("@") ? i.funcName : `@${i.funcName}`;
        const sig = i.functionSignature ? `(${i.functionSignature})` : "";
        if (sig) {
          return `${dest}call ${this.typeToString(i.returnType)} ${sig} ${name}(${args})`;
        }
        return `${dest}call ${this.typeToString(i.returnType)} ${name}(${args})`;
      }
      case IROpcode.RET: {
        const i = inst as ReturnInst;
        if (!i.value) return "ret void";
        return `ret ${this.typeToString(i.type)} ${i.value}`;
      }
      case IROpcode.BR: {
        const i = inst as BranchInst;
        return `br label %${i.label.replace("%", "")}`;
      }
      case IROpcode.COND_BR: {
        const i = inst as CondBranchInst;
        return `br i1 ${i.cond}, label %${i.trueLabel.replace("%", "")}, label %${i.falseLabel.replace("%", "")}`;
      }
      case IROpcode.GET_ELEMENT_PTR: {
        const i = inst as GetElementPtrInst;
        return `${i.dest} = getelementptr ${this.typeToString(i.baseType)}, ptr ${i.ptr}, ${i.indices.map((idx) => `${idx.type} ${idx.value}`).join(", ")}`;
      }
      case IROpcode.SWITCH: {
        const i = inst as SwitchInst;
        const cases = i.cases
          .map((c) => `i64 ${c.val}, label %${c.label}`)
          .join(" ");
        return `switch i64 ${i.value}, label %${i.defaultLabel} [ ${cases} ]`;
      }
      case IROpcode.INLINE_ASM: {
        const asm = inst as InlineAsmInst;
        const constraintList = asm.constraints
          .split(",")
          .filter((c) => !c.startsWith("~"));
        const args = asm.args
          .map((a, index) => {
            const constraint = constraintList[index] || "";
            const typeStr = this.typeToString(a.type);
            if (
              constraint.includes("*") &&
              a.type.type === "pointer" &&
              a.type.base
            ) {
              return `${typeStr} elementtype(${this.typeToString(a.type.base)}) ${a.value}`;
            }
            return `${typeStr} ${a.value}`;
          })
          .join(", ");
        return `call void asm sideeffect inteldialect "${asm.asm}", "${asm.constraints}"(${args})`;
      }
      case IROpcode.SEXT:
      case IROpcode.ZEXT:
      case IROpcode.TRUNC:
      case IROpcode.BITCAST:
      case IROpcode.FP_TO_SI:
      case IROpcode.FP_TO_UI:
      case IROpcode.SI_TO_FP:
      case IROpcode.UI_TO_FP:
      case IROpcode.FP_EXT:
      case IROpcode.FP_TRUNC:
      case IROpcode.PTR_TO_INT:
      case IROpcode.INT_TO_PTR: {
        const i = inst as CastInst;
        let op = IROpcode[i.opcode].toLowerCase().replace(/_/g, "");
        if (i.opcode === IROpcode.FP_EXT) op = "fpext";
        if (i.opcode === IROpcode.FP_TRUNC) op = "fptrunc";
        if (i.opcode === IROpcode.FP_TO_SI) op = "fptosi";
        if (i.opcode === IROpcode.FP_TO_UI) op = "fptoui";
        if (i.opcode === IROpcode.SI_TO_FP) op = "sitofp";
        if (i.opcode === IROpcode.UI_TO_FP) op = "uitofp";
        if (i.opcode === IROpcode.PTR_TO_INT) op = "ptrtoint";
        if (i.opcode === IROpcode.INT_TO_PTR) op = "inttoptr";
        return `${i.dest} = ${op} ${this.typeToString(i.srcType)} ${i.value} to ${this.typeToString(i.destType)}`;
      }
      case IROpcode.UNREACHABLE:
        return "unreachable";
      default:
        return `; Unknown instruction ${inst.opcode}`;
    }
  }

  private buildBinary(inst: BinaryInst): string {
    const op = IROpcode[inst.opcode].toLowerCase();
    let llvmOp = op;
    if (op === "mod") llvmOp = "srem";
    if (op === "umod") llvmOp = "urem";
    if (op === "div") llvmOp = "sdiv";
    if (op === "udiv") llvmOp = "udiv";
    if (op === "fmod") llvmOp = "frem";
    if (op === "shr") llvmOp = "ashr"; // Default to arithmetic shift right
    if (op === "shl") llvmOp = "shl";
    if (
      ["eq", "ne", "lt", "gt", "le", "ge", "ult", "ugt", "ule", "uge"].includes(
        op,
      )
    ) {
      let pred = op;
      if (op === "lt") pred = "slt";
      if (op === "gt") pred = "sgt";
      if (op === "le") pred = "sle";
      if (op === "ge") pred = "sge";
      // ult, ugt, ule, uge are already correct predicates
      llvmOp = "icmp " + pred;
    }
    if (["foeq", "fone", "folt", "fogt", "fole", "foge"].includes(op)) {
      llvmOp = "fcmp " + op.substring(1);
    }
    return `${inst.dest} = ${llvmOp} ${this.typeToString(inst.type)} ${inst.left}, ${inst.right}`;
  }

  private typeToString(type: IRType): string {
    return irTypeToString(type);
  }

  private formatName(name: string): string {
    if (name.includes("<") || name.includes(">") || name.includes(" ")) {
      return `"${name}"`;
    }
    return name;
  }

  private escapeString(str: string): string {
    return str
      .replace(/\\/g, "\\5C")
      .replace(/"/g, "\\22")
      .replace(/\n/g, "\\0A")
      .replace(/\0/g, "\\00");
  }
}
