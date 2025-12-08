import type { IRGenerator } from "../../transpiler/ir/IRGenerator";
import {
  IRVoid,
  irTypeToString,
  type IRType,
} from "../../transpiler/ir/IRType";
import { IROpcode } from "../../transpiler/ir/IRInstruction";
import { CompilerError } from "../../errors";
import { mangleMethod } from "../../utils/methodMangler";
import { resolveExpressionType } from "../../utils/typeResolver";
import ExpressionType from "../expressionType";
import Expression from "./expr";
import IdentifierExpr from "./identifierExpr";
import ArrayLiteralExpr from "./arrayLiteralExpr";

import type Scope from "../../transpiler/Scope";
import type { VariableType } from "./variableDeclarationExpr";

export default class MethodCallExpr extends Expression {
  public resolvedReturnType?: VariableType;

  constructor(
    public receiver: Expression,
    public methodName: string,
    public args: Expression[],
    public genericArgs: VariableType[] = [],
  ) {
    super(ExpressionType.MethodCallExpr);
  }

  toString(depth: number = 0): string {
    this.depth = depth;
    let output = this.getDepth() + `[ MethodCall: ${this.methodName} ]\n`;
    this.depth++;
    output += this.getDepth() + "Receiver:\n";
    output += this.receiver.toString(this.depth + 1);
    output += this.getDepth() + "Arguments:\n";
    this.depth++;
    for (const arg of this.args) {
      output += arg.toString(this.depth + 1);
    }
    this.depth--;
    this.depth--;
    output += this.getDepth() + `/[ MethodCall ]\n`;
    return output;
  }

  toIR(gen: IRGenerator, scope: Scope): string {
    // Resolve receiver type
    let receiverType = resolveExpressionType(this.receiver, scope);
    let isStaticCall = false;

    if (!receiverType) {
      // Check if receiver is a Type (for static method call)
      if (this.receiver.type === ExpressionType.IdentifierExpr) {
        const ident = this.receiver as IdentifierExpr;
        const typeInfo = scope.resolveType(ident.name);
        if (typeInfo) {
          receiverType = {
            name: ident.name,
            isPointer: 0,
            isArray: [],
            genericArgs: ident.genericArgs,
          };
          isStaticCall = true;
        }
      }
    }

    if (!receiverType) {
      throw new CompilerError(
        `Cannot resolve receiver type for method call '${this.methodName}'`,
        this.startToken?.line || 0,
      );
    }

    // Handle pointer receivers - get base type
    let baseType: VariableType = receiverType;
    if (receiverType.isPointer > 0) {
      baseType = {
        ...receiverType,
        isPointer: receiverType.isPointer - 1,
      };
    }

    // Get canonical type name for mangling (handles generics)
    let structName = baseType.name;
    if (baseType.genericArgs && baseType.genericArgs.length > 0) {
      const typeInfo = scope.resolveGenericType(
        baseType.name,
        baseType.genericArgs,
      );
      if (typeInfo) {
        structName = typeInfo.name;
      }
    }

    // --- Intrinsic: Console.log / Console.print ---
    if (
      structName === "Console" &&
      (this.methodName === "log" || this.methodName === "print")
    ) {
      this.args.forEach((arg, index) => {
        const argType = resolveExpressionType(arg, scope);
        const argVal = arg.toIR(gen, scope);

        if (!argType) return;

        let methodToCall = "print_u64";
        let expectedType: IRType = { type: "i64" };

        if (argType.isPointer > 0) {
          if (argType.name === "u8" || argType.name === "char") {
            methodToCall = "print_str";
            expectedType = { type: "pointer", base: { type: "i8" } };
          } else {
            methodToCall = "print_ptr";
            expectedType = { type: "pointer", base: { type: "i8" } };
          }
        } else if (argType.isArray.length > 0) {
          if (argType.name === "u8" || argType.name === "char") {
            methodToCall = "print_str";
            expectedType = { type: "pointer", base: { type: "i8" } };
          } else {
            methodToCall = "print_ptr";
            expectedType = { type: "pointer", base: { type: "i8" } };
          }
        } else {
          if (argType.name === "bool") {
            methodToCall = "print_bool";
            expectedType = { type: "i8" };
          } else if (argType.name === "f32" || argType.name === "f64") {
            methodToCall = "print_f64";
            expectedType = { type: "f64" };
          } else if (argType.name.startsWith("i")) {
            methodToCall = "print_int";
            expectedType = { type: "i64" };
          } else {
            methodToCall = "print_u64";
            expectedType = { type: "i64" };
          }
        }

        const mangled = mangleMethod("Console", methodToCall);
        const currentIRType = gen.getIRType(argType);
        let finalVal = argVal;

        if (methodToCall === "print_int" || methodToCall === "print_u64") {
          if (currentIRType.type !== "i64") {
            const isSigned = argType.name.startsWith("i");
            finalVal = gen.emitCast(
              isSigned ? IROpcode.SEXT : IROpcode.ZEXT,
              argVal,
              expectedType,
              currentIRType,
            );
          }
        } else if (methodToCall === "print_f64") {
          if (currentIRType.type === "f32") {
            finalVal = gen.emitCast(
              IROpcode.FP_EXT,
              argVal,
              expectedType,
              currentIRType,
            );
          }
        } else if (
          methodToCall === "print_str" ||
          methodToCall === "print_ptr"
        ) {
          if (currentIRType.type === "array") {
            finalVal = gen.emitGEP(currentIRType, argVal, ["0", "0"]);
          } else if (currentIRType.type !== expectedType.type) {
            finalVal = gen.emitCast(
              IROpcode.BITCAST,
              argVal,
              expectedType,
              currentIRType,
            );
          }
        }

        gen.emitCall(mangled, [{ value: finalVal, type: expectedType }], {
          type: "void",
        });
      });

      if (this.methodName === "log") {
        const println = mangleMethod("Console", "println");
        gen.emitCall(println, [], { type: "void" });
      }

      return "";
    }

    // Mangle method name
    let mangledName = mangleMethod(structName, this.methodName);

    // Check if this was monomorphized (semantic analyzer sets this)
    if (this.monomorphizedName) {
      mangledName = this.monomorphizedName;
    }

    // Resolve function
    let func = scope.resolveFunction(mangledName);

    // Inheritance lookup
    if (!func) {
      let currentStructName = structName;
      let depth = 0;
      while (depth < 10) {
        const typeInfo = scope.resolveType(currentStructName);
        if (!typeInfo || !typeInfo.parentType) break;

        currentStructName = typeInfo.parentType;
        const parentMangledName = mangleMethod(
          currentStructName,
          this.methodName,
        );
        const parentFunc = scope.resolveFunction(parentMangledName);
        if (parentFunc) {
          func = parentFunc;
          mangledName = parentMangledName;
          break;
        }
        depth++;
      }
    }

    if (!func) {
      throw new CompilerError(
        `Method '${this.methodName}' not found on type '${structName}' (in method call)`,
        this.startToken?.line || 0,
      );
    }

    // Get receiver address (only if not static)
    let receiverPtr: string | null = null;
    if (!isStaticCall) {
      if (receiverType.isPointer > 0) {
        // Already a pointer, use directly
        receiverPtr = this.receiver.toIR(gen, scope);
      } else {
        // Need to get address
        if (this.receiver.getAddress) {
          receiverPtr = this.receiver.getAddress(gen, scope);
        } else {
          // Fallback: evaluate to temp and get address
          const receiverVal = this.receiver.toIR(gen, scope);
          const tempPtr = gen.emitAlloca(
            gen.getIRType(receiverType),
            "receiver",
          );
          gen.emitStore(gen.getIRType(receiverType), receiverVal, tempPtr);
          receiverPtr = tempPtr;
        }
      }
    }

    // Prepare arguments (receiver is first if not static)
    const argValues: { value: string; type: any }[] = [];
    if (!isStaticCall && receiverPtr) {
      argValues.push({
        value: receiverPtr,
        type: gen.getIRType({
          name: structName,
          isPointer: 1,
          isArray: [],
        }),
      });
    }

    // Process remaining arguments (same logic as FunctionCallExpr)
    this.args.forEach((arg, index) => {
      let val = arg.toIR(gen, scope);
      const paramIndex = index + (isStaticCall ? 0 : 1); // Offset by 1 for receiver if not static

      let type: any;
      if (func.args && func.args[paramIndex]) {
        const paramVarType = func.args[paramIndex].type;
        type = gen.getIRType(paramVarType);

        // Handle slice conversion (T[])
        if (paramVarType.isArray.length > 0 && paramVarType.isArray[0] === -1) {
          let size = 0;
          if (arg instanceof ArrayLiteralExpr) {
            size = arg.elements.length;
          } else {
            const argType = resolveExpressionType(arg, scope);
            if (argType && argType.isArray.length > 0) {
              size = argType.isArray[0] ?? 0;
            }
          }

          // Construct slice struct { ptr, size }
          const structType = type;
          const structAlloca = gen.emitAlloca(structType);

          // Store ptr
          const ptrPtr = gen.emitGEP(structType, structAlloca, ["0", "0"]);

          const argType = resolveExpressionType(arg, scope);
          const argIRType: IRType = argType
            ? gen.getIRType(argType)
            : { type: "pointer", base: { type: "i8" } };
          const elemPtrType = structType.fields[0];

          let ptrVal = val;
          if (argIRType.type === "array") {
            // Array literal returns pointer to array [N x T]*
            // We need *T. GEP 0, 0
            ptrVal = gen.emitGEP(argIRType, val, ["0", "0"]);
          } else if (
            argIRType.type === "pointer" &&
            argIRType.base.type === "array"
          ) {
            // Pointer to array -> pointer to first element
            ptrVal = gen.emitGEP(argIRType.base, val, ["0", "0"]);
          } else {
            // Already a pointer, just cast if needed
            if (argIRType.type !== elemPtrType.type) {
              ptrVal = gen.emitCast(
                IROpcode.BITCAST,
                val,
                argIRType,
                elemPtrType,
              );
            }
          }

          gen.emitStore(elemPtrType, ptrVal, ptrPtr);

          // Store size
          const sizePtr = gen.emitGEP(structType, structAlloca, ["0", "1"]);
          gen.emitStore({ type: "i64" }, size.toString(), sizePtr);

          // Load struct to pass by value
          val = gen.emitLoad(structType, structAlloca);
        } else {
          // Check if cast is needed
          const argType = resolveExpressionType(arg, scope);
          if (argType) {
            const argIRType = gen.getIRType(argType);
            // Apply same casting logic as FunctionCallExpr
            if (argIRType.type !== type.type) {
              val = this.applyCast(gen, val, argIRType, type);
            }
          }
        }
      } else {
        const exprType = resolveExpressionType(arg, scope);
        type = exprType ? gen.getIRType(exprType) : { type: "i64" };

        // Array decay
        if (type.type === "array") {
          type = { type: "pointer", base: type.base };
        }
      }

      argValues.push({ value: val, type: type });
    });

    const returnType = func.returnType
      ? gen.getIRType(func.returnType)
      : IRVoid;

    const funcName = func.irName || `@${mangledName}`;

    let signature: string | undefined;
    if (func.isVariadic) {
      const argTypes = (func.args || []).map((a) => {
        const t = gen.getIRType(a.type);
        return irTypeToString(t);
      });
      signature = argTypes.join(", ");
      if (signature) signature += ", ...";
      else signature = "...";
    }

    if (gen.enableStackTrace) {
      gen.updateStackLine(this.startToken?.line || 0);
    }

    const result = gen.emitCall(funcName, argValues, returnType, signature);
    return result || "";
  }

  private applyCast(
    gen: IRGenerator,
    val: string,
    srcType: any,
    destType: any,
  ): string {
    const { IROpcode } = require("../../transpiler/ir/IRInstruction");

    if (srcType.type.startsWith("i") && destType.type.startsWith("i")) {
      const srcSize = parseInt(srcType.type.substring(1));
      const destSize = parseInt(destType.type.substring(1));
      if (srcSize < destSize) {
        return gen.emitCast(IROpcode.ZEXT, val, destType, srcType);
      } else if (srcSize > destSize) {
        return gen.emitCast(IROpcode.TRUNC, val, destType, srcType);
      }
    } else if (srcType.type === "pointer" && destType.type.startsWith("i")) {
      return gen.emitCast(IROpcode.PTR_TO_INT, val, destType, srcType);
    } else if (srcType.type.startsWith("i") && destType.type === "pointer") {
      return gen.emitCast(IROpcode.INT_TO_PTR, val, destType, srcType);
    } else if (srcType.type === "f32" && destType.type === "f64") {
      return gen.emitCast(IROpcode.FP_EXT, val, destType, srcType);
    } else if (srcType.type === "f64" && destType.type === "f32") {
      return gen.emitCast(IROpcode.FP_TRUNC, val, destType, srcType);
    }

    return val;
  }

  /**
   * Get the address of a method call result.
   * Since method calls return values (not pointers), we need to allocate
   * a temporary variable and store the result there.
   */
  getAddress(gen: IRGenerator, scope: Scope): string {
    const returnType = this.resolvedReturnType || this.resolvedType;
    if (!returnType) {
      throw new CompilerError(
        `Cannot determine return type of method call '${this.methodName}'`,
        this.startToken?.line || 0,
      );
    }

    // Generate the IR for this method call
    const resultVal = this.toIR(gen, scope);

    // Allocate a temporary variable for the result
    const irType = gen.getIRType(returnType);
    const tempPtr = gen.emitAlloca(irType, "_mcall_temp");

    // Store the result
    gen.emitStore(irType, resultVal, tempPtr);

    return tempPtr;
  }
}
