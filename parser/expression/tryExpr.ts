import type { IRGenerator } from "../../transpiler/ir/IRGenerator";
import type { IRType } from "../../transpiler/ir/IRType";
import Scope from "../../transpiler/Scope";
import ExpressionType from "../expressionType";
import BlockExpr from "./blockExpr";
import Expression from "./expr";
import type { VariableType } from "./variableDeclarationExpr";
import { IROpcode } from "../../transpiler/ir/IRInstruction";

function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
  }
  return hash >>> 0;
}

export interface CatchBlock {
  variableName: string;
  variableType: VariableType;
  block: BlockExpr;
}

export default class TryExpr extends Expression {
  constructor(
    public tryBlock: BlockExpr,
    public catchBlocks: CatchBlock[],
  ) {
    super(ExpressionType.TryExpression);
    this.requiresSemicolon = false;
  }

  public toString(depth: number = 0): string {
    this.depth = depth;
    let output = `${this.getDepth()}`;
    output += " [ Try Expression ]\n";
    this.depth++;
    output += `${this.getDepth()} Try Block:\n`;
    output += this.tryBlock.toString(this.depth + 1);

    for (const catchBlock of this.catchBlocks) {
      output += `${this.getDepth()} Catch (${catchBlock.variableName}: ${catchBlock.variableType.name}):\n`;
      output += catchBlock.block.toString(this.depth + 1);
    }
    this.depth--;
    output += `${this.getDepth()}`;
    output += "/[ Try Expression ]\n";
    return output;
  }

  toIR(gen: IRGenerator, scope: Scope): string {
    // 1. Allocate ExceptionNode on stack
    const node = gen.emitAlloca({ type: "struct", name: "ExceptionNode" });

    // 2. Push to stack
    const top = gen.emitLoad(
      { type: "pointer", base: { type: "struct", name: "ExceptionNode" } },
      "@__exception_stack_top",
    );
    const nextPtr = gen.emitGEP(
      { type: "struct", name: "ExceptionNode" },
      node,
      ["0", "1"],
    );
    gen.emitStore(
      { type: "pointer", base: { type: "struct", name: "ExceptionNode" } },
      top,
      nextPtr,
    );

    gen.emitStore(
      { type: "pointer", base: { type: "struct", name: "ExceptionNode" } },
      node,
      "@__exception_stack_top",
    );

    // 3. setjmp
    const envPtr = gen.emitGEP(
      { type: "struct", name: "ExceptionNode" },
      node,
      ["0", "0"],
    );
    const envPtrI8 = gen.emitCast(
      IROpcode.BITCAST,
      envPtr,
      {
        type: "pointer",
        base: { type: "array", size: 200, base: { type: "i8" } },
      },
      { type: "pointer", base: { type: "i8" } },
    );
    const res = gen.emitCall(
      "setjmp",
      [{ value: envPtrI8, type: { type: "pointer", base: { type: "i8" } } }],
      { type: "i32" },
    );

    // 4. Check result
    const isZero = gen.emitBinary(IROpcode.EQ, { type: "i32" }, res!, "0");

    const tryBlock = gen.createBlock("try_block");
    const catchDispatch = gen.createBlock("catch_dispatch");
    const endBlock = gen.createBlock("try_end");

    gen.emitCondBranch(isZero, tryBlock.name, catchDispatch.name);

    // Try Block
    gen.setBlock(tryBlock);
    this.tryBlock.toIR(gen, scope);

    // Pop stack
    gen.emitStore(
      { type: "pointer", base: { type: "struct", name: "ExceptionNode" } },
      top,
      "@__exception_stack_top",
    );

    gen.emitBranch(endBlock.name);

    // Catch Dispatch
    gen.setBlock(catchDispatch);

    // Restore stack (pop the handler that caught this)
    gen.emitStore(
      { type: "pointer", base: { type: "struct", name: "ExceptionNode" } },
      top,
      "@__exception_stack_top",
    );

    // Load exception type ID
    const typeId = gen.emitLoad(
      { type: "i32" },
      "@__current_exception_type_id",
    );

    const rethrowBlock = gen.createBlock("rethrow");

    let currentCheckBlock = catchDispatch;

    for (let i = 0; i < this.catchBlocks.length; i++) {
      const catchBlock = this.catchBlocks[i]!;
      const catchTypeHash = djb2(catchBlock.variableType.name);

      const matchBlock = gen.createBlock(`catch_match_${i}`);
      const nextCheckBlock =
        i === this.catchBlocks.length - 1
          ? rethrowBlock
          : gen.createBlock(`catch_check_${i + 1}`);

      gen.setBlock(currentCheckBlock);
      const isMatch = gen.emitBinary(
        IROpcode.EQ,
        { type: "i32" },
        typeId,
        catchTypeHash.toString(),
      );
      gen.emitCondBranch(isMatch, matchBlock.name, nextCheckBlock.name);

      // Match Block
      gen.setBlock(matchBlock);

      // Get exception object
      const exceptionPtr = gen.emitLoad(
        { type: "pointer", base: { type: "i8" } },
        "@__current_exception",
      );

      // Cast to variable type pointer
      const varType = gen.getIRType(catchBlock.variableType);
      const varTypePtr = { type: "pointer", base: varType } as IRType;
      const castedExPtr = gen.emitCast(
        IROpcode.BITCAST,
        exceptionPtr,
        { type: "pointer", base: { type: "i8" } },
        varTypePtr,
      );

      // Declare variable in scope (allocate stack space)
      const varPtr = gen.emitAlloca(varType);

      // Copy exception object to stack variable
      const val = gen.emitLoad(varType, castedExPtr);
      gen.emitStore(varType, val, varPtr);

      // Create a new scope for the catch block
      const catchScope = new Scope(scope);

      // Declare variable
      catchScope.define(catchBlock.variableName, {
        type: "local",
        declaration: this.startToken,
        isParameter: false,
        irName: varPtr,
        varType: catchBlock.variableType,
        offset: "0",
      });

      catchBlock.block.toIR(gen, catchScope);
      gen.emitBranch(endBlock.name);

      currentCheckBlock = nextCheckBlock;
    }

    // Rethrow Block
    gen.setBlock(rethrowBlock);

    // Get __exception_stack_top (which is now the previous one)
    const top2 = gen.emitLoad(
      { type: "pointer", base: { type: "struct", name: "ExceptionNode" } },
      "@__exception_stack_top",
    );

    // Check if null
    const isNull2 = gen.emitBinary(
      IROpcode.EQ,
      { type: "pointer", base: { type: "struct", name: "ExceptionNode" } },
      top2,
      "null",
    );

    const exitBlock2 = gen.createBlock("uncaught_exception_rethrow");
    const jumpBlock2 = gen.createBlock("jump_to_handler_rethrow");

    gen.emitCondBranch(isNull2, exitBlock2.name, jumpBlock2.name);

    gen.setBlock(exitBlock2);
    const msg2 = gen.addStringConstant("Uncaught exception (rethrow)\n");
    gen.emitCall(
      "printf",
      [{ value: msg2, type: { type: "pointer", base: { type: "i8" } } }],
      { type: "i32" },
    );
    gen.emitCall("exit", [{ value: "1", type: { type: "i32" } }], {
      type: "void",
    });
    gen.emitUnreachable();

    gen.setBlock(jumpBlock2);
    const envPtr2 = gen.emitGEP(
      { type: "struct", name: "ExceptionNode" },
      top2,
      ["0", "0"],
    );
    const envPtrI8_2 = gen.emitCast(
      IROpcode.BITCAST,
      envPtr2,
      {
        type: "pointer",
        base: { type: "array", size: 200, base: { type: "i8" } },
      },
      { type: "pointer", base: { type: "i8" } },
    );

    gen.emitCall(
      "longjmp",
      [
        { value: envPtrI8_2, type: { type: "pointer", base: { type: "i8" } } },
        { value: "1", type: { type: "i32" } },
      ],
      { type: "void" },
    );
    gen.emitUnreachable();

    gen.setBlock(endBlock);
    return "";
  }
}
