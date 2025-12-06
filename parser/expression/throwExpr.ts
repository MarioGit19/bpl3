import type { IRGenerator } from "../../transpiler/ir/IRGenerator";
import type Scope from "../../transpiler/Scope";
import ExpressionType from "../expressionType";
import Expression from "./expr";
import { resolveExpressionType } from "../../utils/typeResolver";
import { IROpcode } from "../../transpiler/ir/IRInstruction";
import { CompilerError } from "../../errors";

function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
  }
  return hash >>> 0;
}

export default class ThrowExpr extends Expression {
  constructor(public expression: Expression) {
    super(ExpressionType.ThrowExpression);
  }

  public toString(depth: number = 0): string {
    this.depth = depth;
    let output = `${this.getDepth()}`;
    output += " [ Throw Expression ]\n";
    this.depth++;
    output += this.expression.toString(this.depth);
    this.depth--;
    output += `${this.getDepth()}`;
    output += "/[ Throw Expression ]\n";
    return output;
  }

  toIR(gen: IRGenerator, scope: Scope): string {
    const val = this.expression.toIR(gen, scope);
    const type = resolveExpressionType(this.expression, scope);

    if (!type) {
      throw new CompilerError(
        "Cannot resolve type of thrown expression",
        this.startToken?.line || 0,
      );
    }

    const irType = gen.getIRType(type);
    const typeHash = djb2(type.name);

    // Allocate memory for the exception object
    const typeInfo = scope.resolveType(type.name);
    if (!typeInfo)
      throw new CompilerError(
        "Unknown type " + type.name,
        this.startToken?.line || 0,
      );

    let size = typeInfo.size;
    if (type.isPointer > 0) size = 8;

    const mallocPtr = gen.emitCall(
      "malloc",
      [{ value: size.toString(), type: { type: "i64" } }],
      { type: "pointer", base: { type: "i8" } },
    );

    if (!mallocPtr)
      throw new CompilerError("malloc failed", this.startToken?.line || 0);

    // Cast mallocPtr to pointer to type
    const typedPtr = gen.emitCast(
      IROpcode.BITCAST,
      mallocPtr,
      { type: "pointer", base: { type: "i8" } },
      { type: "pointer", base: irType },
    );

    // Store value
    gen.emitStore(irType, val, typedPtr);

    // Store mallocPtr in __current_exception
    gen.emitStore(
      { type: "pointer", base: { type: "i8" } },
      mallocPtr,
      "@__current_exception",
    );

    // Store type ID
    gen.emitStore(
      { type: "i32" },
      typeHash.toString(),
      "@__current_exception_type_id",
    );

    // Get __exception_stack_top
    const top = gen.emitLoad(
      { type: "pointer", base: { type: "struct", name: "ExceptionNode" } },
      "@__exception_stack_top",
    );

    // Check if null
    const isNull = gen.emitBinary(
      IROpcode.EQ,
      { type: "pointer", base: { type: "struct", name: "ExceptionNode" } },
      top,
      "null",
    );

    const exitBlock = gen.createBlock("uncaught_exception");
    const jumpBlock = gen.createBlock("jump_to_handler");

    gen.emitCondBranch(isNull, exitBlock.name, jumpBlock.name);

    gen.setBlock(exitBlock);
    // Print error and exit
    const msg = gen.addStringConstant("Uncaught exception\n");
    gen.emitCall(
      "printf",
      [{ value: msg, type: { type: "pointer", base: { type: "i8" } } }],
      { type: "i32" },
    );
    gen.emitCall("exit", [{ value: "1", type: { type: "i32" } }], {
      type: "void",
    });
    gen.emitUnreachable();

    gen.setBlock(jumpBlock);
    // Get jmp_buf from ExceptionNode
    const envPtr = gen.emitGEP({ type: "struct", name: "ExceptionNode" }, top, [
      "0",
      "0",
    ]);
    // Cast envPtr to i8* for longjmp
    const envPtrI8 = gen.emitCast(
      IROpcode.BITCAST,
      envPtr,
      {
        type: "pointer",
        base: { type: "array", size: 200, base: { type: "i8" } },
      },
      { type: "pointer", base: { type: "i8" } },
    );

    gen.emitCall(
      "longjmp",
      [
        { value: envPtrI8, type: { type: "pointer", base: { type: "i8" } } },
        { value: "1", type: { type: "i32" } },
      ],
      { type: "void" },
    );
    gen.emitUnreachable();

    return "";
  }
}
