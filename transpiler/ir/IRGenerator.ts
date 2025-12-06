import Scope from "../Scope";
import { IRBlock } from "./IRBlock";
import { IRFunction } from "./IRFunction";
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
  UnreachableInst,
} from "./IRInstruction";
import { IRModule } from "./IRModule";

import type { IRType } from "./IRType";
import type { TypeInfo } from "../Scope";
import type { VariableType } from "../../parser/expression/variableDeclarationExpr";
import { getIntSize, isSignedInt } from "../../utils/typeResolver";

export class IRGenerator {
  public module: IRModule;
  public currentFunction: IRFunction | null = null;
  public currentBlock: IRBlock | null = null;
  private tempCount: number = 0;
  private labelCount: number = 0;
  private stringConstants: Map<string, string> = new Map();

  constructor() {
    this.module = new IRModule();
  }

  // --- Module Level ---

  createFunction(
    name: string,
    args: { name: string; type: IRType }[],
    returnType: IRType,
    isVariadic: boolean = false, // Add this
  ): IRFunction {
    // Check if function already exists
    const existingIndex = this.module.functions.findIndex(
      (f) => f.name === name,
    );
    if (existingIndex !== -1) {
      const existing = this.module.functions[existingIndex]!;
      // If existing is a declaration (no blocks), we can replace it
      if (existing.blocks.length === 0) {
        this.module.functions.splice(existingIndex, 1);
      }
    }

    const func = new IRFunction(name, args, returnType, isVariadic);
    this.module.addFunction(func);
    this.currentFunction = func;
    return func;
  }

  ensureIntrinsic(
    name: string,
    args: { name: string; type: IRType }[],
    returnType: IRType,
    isVariadic: boolean = false,
  ) {
    if (this.module.functions.some((f) => f.name === name)) return;
    const func = new IRFunction(name, args, returnType, isVariadic);
    this.module.addFunction(func);
  }

  // --- Block Level ---

  createBlock(labelPrefix: string = "block"): IRBlock {
    const label = `${labelPrefix}_${this.labelCount++}`;
    const block = new IRBlock(label);
    if (this.currentFunction) {
      this.currentFunction.addBlock(block);
    }
    return block;
  }

  setBlock(block: IRBlock) {
    this.currentBlock = block;
  }

  // --- Instruction Emission ---

  emit(inst: IRInstruction) {
    if (!this.currentBlock) {
      throw new Error("Cannot emit instruction without a current block");
    }
    this.currentBlock.add(inst);
  }

  // --- Helpers ---

  getTemp(prefix: string = "t"): string {
    return `%${prefix}_${this.tempCount++}`;
  }

  // Helper to emit binary op
  emitBinary(
    opcode: IROpcode | string,
    type: IRType | string,
    left: string,
    right: string,
  ): string {
    let op: IROpcode;
    if (typeof opcode === "string") {
      switch (opcode) {
        case "add":
          op = IROpcode.ADD;
          break;
        case "sub":
          op = IROpcode.SUB;
          break;
        case "mul":
          op = IROpcode.MUL;
          break;
        case "div":
          op = IROpcode.DIV;
          break;
        case "mod":
          op = IROpcode.MOD;
          break;
        case "and":
          op = IROpcode.AND;
          break;
        case "or":
          op = IROpcode.OR;
          break;
        case "xor":
          op = IROpcode.XOR;
          break;
        case "shl":
          op = IROpcode.SHL;
          break;
        case "shr":
          op = IROpcode.SHR;
          break;
        case "eq":
          op = IROpcode.EQ;
          break;
        case "ne":
          op = IROpcode.NE;
          break;
        case "lt":
          op = IROpcode.LT;
          break;
        case "gt":
          op = IROpcode.GT;
          break;
        case "le":
          op = IROpcode.LE;
          break;
        case "ge":
          op = IROpcode.GE;
          break;
        default:
          throw new Error(`Unknown binary opcode string: ${opcode}`);
      }
    } else {
      op = opcode;
    }

    let irType: IRType;
    if (typeof type === "string") {
      if (type === "i64") irType = { type: "i64" };
      else if (type === "i32") irType = { type: "i32" };
      else if (type === "f64") irType = { type: "f64" };
      else if (type === "f32") irType = { type: "f32" };
      else if (type === "i8") irType = { type: "i8" };
      else if (type === "i1")
        irType = { type: "i1" }; // Boolean
      else irType = { type: "i64" };
    } else {
      irType = type;
    }

    const dest = this.getTemp();
    this.emit(new BinaryInst(op, irType, left, right, dest));
    return dest;
  }

  // Helper to emit switch
  emitSwitch(
    value: string,
    defaultLabel: string,
    cases: { val: number; label: string }[],
  ) {
    this.emit(new SwitchInst(value, defaultLabel, cases));
  }

  // Helper to emit inline asm
  emitInlineAsm(
    asm: string,
    constraints: string,
    args: { value: string; type: IRType }[],
  ) {
    this.emit(new InlineAsmInst(asm, constraints, args));
  }

  // Helper to emit alloca
  emitAlloca(type: IRType, name: string = "var"): string {
    const dest = `%${name}_${this.tempCount++}`; // Use % for local vars
    this.emit(new AllocaInst(type, dest));
    return dest;
  }

  // Helper to emit load
  emitLoad(type: IRType, ptr: string): string {
    const dest = this.getTemp("load");
    this.emit(new LoadInst(type, ptr, dest));
    return dest;
  }

  // Helper to emit store
  emitStore(type: IRType, value: string, ptr: string) {
    this.emit(new StoreInst(type, value, ptr));
  }

  // Helper to emit return
  emitReturn(value: string | null = null, type: IRType = { type: "void" }) {
    this.emit(new ReturnInst(value, type));
  }

  // Helper to emit call
  emitCall(
    funcName: string,
    args: { value: string; type: IRType }[],
    returnType: IRType,
    functionSignature?: string,
  ): string | null {
    if (returnType.type === "void") {
      this.emit(
        new CallInst(funcName, args, returnType, null, functionSignature),
      );
      return null;
    } else {
      const dest = this.getTemp("call");
      this.emit(
        new CallInst(funcName, args, returnType, dest, functionSignature),
      );
      return dest;
    }
  }

  // Helper to emit branch
  emitBranch(label: string) {
    this.emit(new BranchInst(label));
  }

  emitUnreachable() {
    this.emit(new UnreachableInst());
  }

  // Helper to emit cond branch
  emitCondBranch(cond: string, trueLabel: string, falseLabel: string) {
    this.emit(new CondBranchInst(cond, trueLabel, falseLabel));
  }

  // Helper to emit GEP
  emitGEP(
    baseType: IRType,
    ptr: string,
    indices: (string | { value: string; type: string })[],
  ): string {
    const dest = this.getTemp("gep");
    const typedIndices = indices.map((i, idx) => {
      if (typeof i === "string") {
        // First index is always i64 (for array of structs)
        // Second+ indices are i32 (for struct field access)
        return { value: i, type: idx === 0 ? "i64" : "i32" };
      }
      return i;
    });
    this.emit(new GetElementPtrInst(baseType, ptr, typedIndices, dest));
    return dest;
  }

  // Helper to emit Cast
  emitCast(
    opcode: IROpcode,
    value: string,
    destType: IRType,
    srcType: IRType = { type: "i1" },
  ): string {
    const dest = this.getTemp("cast");
    this.emit(new CastInst(opcode, value, srcType, destType, dest));
    return dest;
  }

  // Cast helpers for explicit cast<T>(expr)
  emitBitcast(value: string, srcType: IRType, destType: IRType): string {
    const dest = this.getTemp("cast");
    this.emit(new CastInst(IROpcode.BITCAST, value, srcType, destType, dest));
    return dest;
  }

  emitTrunc(value: string, srcType: IRType, destType: IRType): string {
    const dest = this.getTemp("cast");
    this.emit(new CastInst(IROpcode.TRUNC, value, srcType, destType, dest));
    return dest;
  }

  emitZExt(value: string, srcType: IRType, destType: IRType): string {
    const dest = this.getTemp("cast");
    this.emit(new CastInst(IROpcode.ZEXT, value, srcType, destType, dest));
    return dest;
  }

  emitSExt(value: string, srcType: IRType, destType: IRType): string {
    const dest = this.getTemp("cast");
    this.emit(new CastInst(IROpcode.SEXT, value, srcType, destType, dest));
    return dest;
  }

  emitFPTrunc(value: string, srcType: IRType, destType: IRType): string {
    const dest = this.getTemp("cast");
    this.emit(new CastInst(IROpcode.FP_TRUNC, value, srcType, destType, dest));
    return dest;
  }

  emitFPExt(value: string, srcType: IRType, destType: IRType): string {
    const dest = this.getTemp("cast");
    this.emit(new CastInst(IROpcode.FP_EXT, value, srcType, destType, dest));
    return dest;
  }

  emitFPToSI(value: string, srcType: IRType, destType: IRType): string {
    const dest = this.getTemp("cast");
    this.emit(new CastInst(IROpcode.FP_TO_SI, value, srcType, destType, dest));
    return dest;
  }

  emitFPToUI(value: string, srcType: IRType, destType: IRType): string {
    const dest = this.getTemp("cast");
    this.emit(new CastInst(IROpcode.FP_TO_UI, value, srcType, destType, dest));
    return dest;
  }

  emitSIToFP(value: string, srcType: IRType, destType: IRType): string {
    const dest = this.getTemp("cast");
    this.emit(new CastInst(IROpcode.SI_TO_FP, value, srcType, destType, dest));
    return dest;
  }

  emitUIToFP(value: string, srcType: IRType, destType: IRType): string {
    const dest = this.getTemp("cast");
    this.emit(new CastInst(IROpcode.UI_TO_FP, value, srcType, destType, dest));
    return dest;
  }

  emitPtrToInt(value: string, srcType: IRType, destType: IRType): string {
    const dest = this.getTemp("cast");
    this.emit(
      new CastInst(IROpcode.PTR_TO_INT, value, srcType, destType, dest),
    );
    return dest;
  }

  emitIntToPtr(value: string, srcType: IRType, destType: IRType): string {
    const dest = this.getTemp("cast");
    this.emit(
      new CastInst(IROpcode.INT_TO_PTR, value, srcType, destType, dest),
    );
    return dest;
  }

  getIRType(type: VariableType): IRType {
    if (type.isPointer > 0) {
      const base = this.getIRType({ ...type, isPointer: type.isPointer - 1 });
      return { type: "pointer", base };
    }
    if (type.isArray.length > 0) {
      const base = this.getIRType({ ...type, isArray: type.isArray.slice(1) });
      const size = type.isArray[0];
      if (size === undefined) {
        throw new Error("Array size must be defined");
      }
      return { type: "array", base, size };
    }

    switch (type.name) {
      case "void":
        return { type: "void" };
      case "u8":
      case "i8":
        return { type: "i8" };
      case "u16":
      case "i16":
        return { type: "i16" };
      case "u32":
      case "i32":
        return { type: "i32" };
      case "u64":
      case "i64":
        return { type: "i64" };
      case "f32":
        return { type: "f32" };
      case "f64":
        return { type: "f64" };
      default:
        let name = type.name;
        if (type.genericArgs && type.genericArgs.length > 0) {
          name = this.getCanonicalTypeName(type);
        }
        return { type: "struct", name: name, fields: [] };
    }
  }

  private getCanonicalTypeName(type: VariableType): string {
    let name = type.name;
    if (type.genericArgs && type.genericArgs.length > 0) {
      name += `<${type.genericArgs.map((a) => this.getCanonicalTypeName(a)).join(",")}>`;
    }
    return name;
  }

  addStringConstant(str: string): string {
    if (this.stringConstants.has(str)) {
      return this.stringConstants.get(str)!;
    }
    const name = `@.str.${this.stringConstants.size}`;
    const len = str.length + 1;
    const type: IRType = { type: "array", base: { type: "i8" }, size: len };

    this.module.addGlobal(name, type, str);
    this.stringConstants.set(str, name);
    return name;
  }

  getStringPtr(str: string): string {
    const globalName = this.addStringConstant(str);
    const len = str.length + 1;
    const type: IRType = { type: "array", base: { type: "i8" }, size: len };
    return this.emitGEP(type, globalName, ["0", "0"]);
  }

  registerStruct(typeInfo: TypeInfo, scope: Scope) {
    if (this.module.structs.some((s) => s.name === typeInfo.name)) return;

    const fields: IRType[] = [];
    for (const member of typeInfo.members.values()) {
      const varType: VariableType = {
        name: member.name,
        isPointer: member.isPointer,
        isArray: member.isArray,
      };

      if (member.isPointer === 0 && !member.isPrimitive) {
        const memberTypeInfo = scope.resolveType(member.name);
        if (memberTypeInfo) {
          this.registerStruct(memberTypeInfo, scope);
        }
      }

      fields.push(this.getIRType(varType));
    }

    this.module.addStruct(typeInfo.name, fields);
  }

  emitTypeCast(
    sourceValue: string,
    sourceType: VariableType,
    targetType: VariableType,
    sourceIRType: IRType,
    targetIRType: IRType,
  ): string {
    const srcIsFloat = sourceType.name === "f32" || sourceType.name === "f64";
    const tgtIsFloat = targetType.name === "f32" || targetType.name === "f64";
    const srcIsPtr = sourceType.isPointer > 0 || sourceType.isArray.length > 0;
    const tgtIsPtr = targetType.isPointer > 0 || targetType.isArray.length > 0;

    // Pointer to pointer
    if (srcIsPtr && tgtIsPtr) {
      let actualSrcType = sourceIRType;
      if (sourceType.isArray.length > 0) {
        actualSrcType = { type: "pointer", base: { type: "i8" } };
      }
      return this.emitBitcast(sourceValue, actualSrcType, targetIRType);
    }

    // Pointer to integer
    if (srcIsPtr && !tgtIsPtr) {
      return this.emitPtrToInt(sourceValue, sourceIRType, targetIRType);
    }

    // Integer to pointer
    if (!srcIsPtr && tgtIsPtr) {
      return this.emitIntToPtr(sourceValue, sourceIRType, targetIRType);
    }

    // Float to float
    if (srcIsFloat && tgtIsFloat) {
      const srcSize = this.getFloatSize(sourceType.name);
      const tgtSize = this.getFloatSize(targetType.name);
      if (srcSize > tgtSize) {
        return this.emitFPTrunc(sourceValue, sourceIRType, targetIRType);
      } else if (srcSize < tgtSize) {
        return this.emitFPExt(sourceValue, sourceIRType, targetIRType);
      }
      return sourceValue;
    }

    // Float to integer
    if (srcIsFloat && !tgtIsFloat) {
      const isSigned = isSignedInt(targetType.name);
      if (isSigned) {
        return this.emitFPToSI(sourceValue, sourceIRType, targetIRType);
      } else {
        return this.emitFPToUI(sourceValue, sourceIRType, targetIRType);
      }
    }

    // Integer to float
    if (!srcIsFloat && tgtIsFloat) {
      const isSigned = isSignedInt(sourceType.name);
      if (isSigned) {
        return this.emitSIToFP(sourceValue, sourceIRType, targetIRType);
      } else {
        return this.emitUIToFP(sourceValue, sourceIRType, targetIRType);
      }
    }

    // Integer to integer
    const srcSize = getIntSize(sourceType.name);
    const tgtSize = getIntSize(targetType.name);

    if (srcSize > tgtSize) {
      return this.emitTrunc(sourceValue, sourceIRType, targetIRType);
    } else if (srcSize < tgtSize) {
      const isSigned = isSignedInt(sourceType.name);
      if (isSigned) {
        return this.emitSExt(sourceValue, sourceIRType, targetIRType);
      } else {
        return this.emitZExt(sourceValue, sourceIRType, targetIRType);
      }
    }

    return sourceValue;
  }

  private getFloatSize(name: string): number {
    if (name === "f32") return 4;
    if (name === "f64") return 8;
    return 0;
  }
}
