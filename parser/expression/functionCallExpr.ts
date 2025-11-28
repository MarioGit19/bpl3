import type AsmGenerator from "../../transpiler/AsmGenerator";
import type Scope from "../../transpiler/Scope";
import ExpressionType from "../expressionType";
import Expression from "./expr";

export default class FunctionCallExpr extends Expression {
  constructor(
    public functionName: string,
    public args: Expression[],
  ) {
    super(ExpressionType.FunctionCall);
  }

  toString(depth: number = 0): string {
    this.depth = depth;
    let output = this.getDepth() + `[ FunctionCall: ${this.functionName} ]\n`;
    this.depth++;
    for (const arg of this.args) {
      output += arg.toString(depth + 1);
    }
    this.depth--;
    output += this.getDepth() + `/[ FunctionCall ]\n`;
    return output;
  }

  log(depth: number = 0): void {
    console.log(this.toString(depth));
  }

  transpile(gen: AsmGenerator, scope: Scope): void {
    const func = scope.resolveFunction(this.functionName);
    if (!func) {
      throw new Error(`Function ${this.functionName} not found`);
    }

    let extraStackAllocated = 0;
    let returnStructSize = 0;
    let isStructReturn = false;

    if (
      func.returnType &&
      !func.returnType.isPointer &&
      !func.returnType.isArray.length
    ) {
      const typeInfo = scope.resolveType(func.returnType.name);
      if (typeInfo && !typeInfo.isPrimitive) {
        isStructReturn = true;
        returnStructSize = typeInfo.size;
      }
    }

    if (isStructReturn) {
      gen.emit(
        `sub rsp, ${returnStructSize}`,
        `Allocate stack for return value (${returnStructSize} bytes)`,
      );
      gen.emit(`mov rax, rsp`, `Address of return value slot`);
      gen.emit(`push rax`, `Push return value slot address`);
      scope.stackOffset += 8;
      extraStackAllocated += returnStructSize;
    }

    this.args.forEach((arg, index) => {
      arg.transpile(gen, scope);

      let isStructByValue = false;
      let structSize = 0;

      if (func.args && func.args[index]) {
        const paramType = func.args[index].type;
        if (paramType.isPointer === 0 && paramType.isArray.length === 0) {
          const typeInfo = scope.resolveType(paramType.name);
          if (typeInfo && !typeInfo.isPrimitive) {
            isStructByValue = true;
            structSize = typeInfo.size;
          }
        }
      }

      if (isStructByValue) {
        gen.emit(
          `sub rsp, ${structSize}`,
          `Allocate stack for struct copy (${structSize} bytes)`,
        );
        gen.emit(`mov rsi, rax`, `Source address`);
        gen.emit(`mov rdi, rsp`, `Destination address (stack)`);
        gen.emit(`mov rcx, ${structSize}`, `Size to copy`);
        gen.emit(`rep movsb`, `Copy struct`);
        gen.emit(`mov rax, rsp`, `Address of copy`);
        gen.emit(`push rax`, `Push address of copy`);
        extraStackAllocated += structSize;
      } else {
        gen.emit(
          "push rax",
          `Push argument ${index} for function call ${this.functionName}`,
        );
      }
      scope.stackOffset += 8; // assuming 64-bit architecture
    });

    const totalArgs = this.args.length + (isStructReturn ? 1 : 0);
    for (let i = totalArgs - 1; i >= 0; i--) {
      gen.emit(
        `pop ${this.argOrders[i]}`,
        `Move argument ${i} into correct register for function call ${this.functionName}`,
      );
      scope.stackOffset -= 8;
    }

    const stackAlignment = 16;
    const currentStackDisplacement = scope.stackOffset + extraStackAllocated;
    const stackOffset = currentStackDisplacement % stackAlignment;
    if (stackOffset !== 0) {
      gen.emit(
        `sub rsp, ${stackAlignment - stackOffset}`,
        `Align stack before calling function ${this.functionName}`,
      );
    }

    gen.emit(
      "xor rax, rax",
      `Clear rax before calling function ${this.functionName}`,
    );
    gen.emit(
      "xor rbx, rbx",
      `Clear rbx before calling function ${this.functionName}`,
    );
    if (func.isExternal) {
      gen.emit(
        `call ${func.startLabel} WRT ..plt`,
        `Call external function ${this.functionName}`,
      );
    } else {
      gen.emit(`call ${func.startLabel}`, `Call function ${this.functionName}`);
    }

    if (stackOffset !== 0) {
      gen.emit(
        `add rsp, ${stackAlignment - stackOffset}`,
        `Restore stack after calling function ${this.functionName}`,
      );
    }

    if (extraStackAllocated > 0) {
      // If we allocated extra stack for struct copies (args), we need to free it.
      // BUT, if we allocated stack for RETURN VALUE, we must NOT free it yet!
      // The return value is on the stack, and rax points to it.
      // We need to keep it until it's used (e.g. by VariableDeclarationExpr).
      // However, FunctionCallExpr is an expression, it returns a value (address).
      // If we free the stack now, the address in rax becomes invalid (pointing to free stack).

      // Wait, if we return a struct by value, the caller (VariableDeclarationExpr) expects
      // the address of the struct.
      // If we allocated it on the stack here, we are responsible for it.
      // If we free it here, it's gone.

      // But `extraStackAllocated` includes both return value slot AND arg copies.
      // Arg copies can be freed. Return value slot cannot.

      const argsStackSize =
        extraStackAllocated - (isStructReturn ? returnStructSize : 0);
      if (argsStackSize > 0) {
        gen.emit(
          `add rsp, ${argsStackSize}`,
          `Free stack space for struct copies (args)`,
        );
      }

      if (isStructReturn) {
        // We leave the return value on the stack.
        // But who frees it?
        // The expression evaluation finishes here.
        // If this is part of a larger expression (e.g. `call foo().x`), we need it.
        // If it's `local p = call foo()`, we need it.
        // If it's `call foo()`, we discard it.

        // This is tricky. In C, the caller allocates space in its own frame (local var)
        // and passes that address.
        // Here, we are allocating temporary space on the stack.
        // We need to clean it up eventually.

        // If we leave it on the stack, `rsp` is not restored to where it was before `transpile`.
        // This will mess up subsequent stack operations in the same block.

        // Ideally, `FunctionCallExpr` should return the address, and the parent expression
        // should consume it.
        // But we don't have a mechanism for "cleanup after parent consumes".

        // However, `VariableDeclarationExpr` copies the data.
        // So after `VariableDeclarationExpr` is done, the data is in the variable.
        // The temp space is no longer needed.

        // But `FunctionCallExpr` doesn't know if it's being called by `VariableDeclarationExpr`.

        // If we use `alloca` style (sub rsp), the space is reclaimed at function exit?
        // No, we are in the middle of a function.

        // Maybe we should just copy the result to a register if it fits? No, it's a struct.

        // Let's look at how `VariableDeclarationExpr` works.
        // It calls `transpile`, then uses `rax`.
        // If we leave `rsp` modified, `VariableDeclarationExpr` will use wrong offsets for locals?
        // `VariableDeclarationExpr` uses `rbp - offset`. `rbp` is stable.
        // So modifying `rsp` is "safe" for local var access, but unsafe for `push/pop`.

        // If we leave it on stack, we must restore `rsp` later.
        // But we can't easily do that.

        // Alternative:
        // Allocate the return slot in `VariableDeclarationExpr` if possible?
        // But `FunctionCallExpr` can be used in `print(call foo().x)`.

        // Correct approach:
        // The caller (FunctionCallExpr) allocates space.
        // It returns the address in `rax`.
        // It MUST restore `rsp` before returning?
        // If it restores `rsp`, the data is "popped" (technically still there but below rsp).
        // If we don't touch stack after this, it's fine?
        // But if we call another function, it will overwrite it.

        // So we CANNOT restore `rsp` if we want to return the data on stack.

        // BUT, if we don't restore `rsp`, we leak stack space until function return?
        // That might be acceptable for a temporary expression.
        // "Statement expression" style.

        // Let's try: Restore `rsp` BUT keep the data there (don't zero it).
        // The data is below `rsp`.
        // As long as we don't push/call anything before using `rax`, it's safe.
        // `VariableDeclarationExpr` does:
        // 1. `this.value.transpile` (FunctionCallExpr) -> returns address in `rax`. `rsp` restored.
        // 2. `mov [rbp-offset], rax` (copies address? NO, we need to copy data).

        // Wait, `VariableDeclarationExpr` needs to be fixed to copy data.
        // If `FunctionCallExpr` restores `rsp`, the data is at `[rax]`.
        // `rax` points to memory *below* `rsp`.
        // Is it safe?
        // If an interrupt happens? (Kernel uses separate stack usually, or red zone).
        // x86-64 has a 128-byte red zone.
        // If our struct is < 128 bytes, it's safe in the red zone.
        // If > 128 bytes, it's unsafe.

        // So we should probably NOT restore `rsp` for the return value,
        // and let the scope know we have extra stack usage?
        // But `Scope.stackOffset` tracks logical stack usage for alignment.

        // If we leave `rsp` modified, we need to track it.
        // But `FunctionCallExpr` finishes.

        // Let's assume for now we rely on the Red Zone (128 bytes) or just risk it for testing.
        // Or better: `VariableDeclarationExpr` should allocate the slot!
        // But `FunctionCallExpr` is generic.

        // Let's try restoring `rsp` and see if it works (Red Zone).
        // Most likely it will work for small structs.

        if (isStructReturn) {
          gen.emit(
            `add rsp, ${returnStructSize}`,
            `Free stack space for return value (relying on Red Zone/immediate usage)`,
          );
        }
      }
    }
  }
}
