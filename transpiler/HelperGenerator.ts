import type Scope from "./Scope";
import type { IRGenerator } from "./ir/IRGenerator";
import type { IRType } from "./ir/IRType";

export default class HelperGenerator {
  static generateExceptionHelpers(gen: IRGenerator): void {
    // Declare setjmp/longjmp
    gen.ensureIntrinsic(
      "setjmp",
      [{ name: "env", type: { type: "pointer", base: { type: "i8" } } }],
      { type: "i32" },
    );
    gen.ensureIntrinsic(
      "longjmp",
      [
        { name: "env", type: { type: "pointer", base: { type: "i8" } } },
        { name: "val", type: { type: "i32" } },
      ],
      { type: "void" },
    );
    gen.ensureIntrinsic("malloc", [{ name: "size", type: { type: "i64" } }], {
      type: "pointer",
      base: { type: "i8" },
    });
    gen.ensureIntrinsic(
      "free",
      [{ name: "ptr", type: { type: "pointer", base: { type: "i8" } } }],
      { type: "void" },
    );
    gen.ensureIntrinsic("exit", [{ name: "status", type: { type: "i32" } }], {
      type: "void",
    });
    gen.ensureIntrinsic(
      "printf",
      [{ name: "format", type: { type: "pointer", base: { type: "i8" } } }],
      { type: "i32" },
      true,
    );

    // struct ExceptionNode { jmp_buf env; struct ExceptionNode* next; }
    // jmp_buf is [200 x i8]
    const jmpBufType: IRType = {
      type: "array",
      size: 200,
      base: { type: "i8" },
    };
    const exceptionNodePtrType: IRType = {
      type: "pointer",
      base: { type: "struct", name: "ExceptionNode" },
    };

    // Check if struct already exists to avoid duplicates
    if (!gen.module.structs.some((s) => s.name === "ExceptionNode")) {
      gen.module.addStruct("ExceptionNode", [jmpBufType, exceptionNodePtrType]);
    }

    // Global __exception_stack_top
    if (!gen.module.globals.some((g) => g.name === "@__exception_stack_top")) {
      gen.module.addGlobal(
        "@__exception_stack_top",
        exceptionNodePtrType,
        "null",
        "linkonce_odr",
      );
    }

    // Global __current_exception
    if (!gen.module.globals.some((g) => g.name === "@__current_exception")) {
      gen.module.addGlobal(
        "@__current_exception",
        { type: "pointer", base: { type: "i8" } },
        "null",
        "linkonce_odr",
      );
    }

    // Global __current_exception_type_id
    if (
      !gen.module.globals.some((g) => g.name === "@__current_exception_type_id")
    ) {
      gen.module.addGlobal(
        "@__current_exception_type_id",
        { type: "i32" },
        "0",
        "linkonce_odr",
      );
    }
  }

  // #region Base Types
  static generateBaseTypes(scope: Scope): void {
    scope.defineType("u8", {
      size: 1,
      alignment: 1,
      isArray: [],
      isPointer: 0,
      isPrimitive: true,
      name: "u8",
      info: {
        description: "Unsigned 8-bit integer",
        signed: false,
        range: [0, 255],
      },
      members: new Map(),
    });

    scope.defineType("u16", {
      size: 2,
      alignment: 2,
      isArray: [],
      isPointer: 0,
      isPrimitive: true,
      name: "u16",
      info: {
        description: "Unsigned 16-bit integer",
        signed: false,
        range: [0, 65535],
      },
      members: new Map(),
    });

    scope.defineType("u32", {
      size: 4,
      alignment: 4,
      isArray: [],
      isPointer: 0,
      isPrimitive: true,
      name: "u32",
      info: {
        description: "Unsigned 32-bit integer",
        signed: false,
        range: [0, 4294967295],
      },
      members: new Map(),
    });

    scope.defineType("u64", {
      size: 8,
      alignment: 8,
      isArray: [],
      isPointer: 0,
      isPrimitive: true,
      name: "u64",
      info: {
        description: "Unsigned 64-bit integer",
        signed: false,
        range: [0, 18446744073709551615],
      },
      members: new Map(),
    });

    scope.defineType("i8", {
      size: 1,
      alignment: 1,
      isArray: [],
      isPointer: 0,
      isPrimitive: true,
      name: "i8",
      info: {
        description: "Signed 8-bit integer",
        signed: true,
        range: [-128, 127],
      },
      members: new Map(),
    });

    scope.defineType("i16", {
      size: 2,
      alignment: 2,
      isArray: [],
      isPointer: 0,
      isPrimitive: true,
      name: "i16",
      info: {
        description: "Signed 16-bit integer",
        signed: true,
        range: [-32768, 32767],
      },
      members: new Map(),
    });

    scope.defineType("i32", {
      size: 4,
      alignment: 4,
      isArray: [],
      isPointer: 0,
      isPrimitive: true,
      name: "i32",
      info: {
        description: "Signed 32-bit integer",
        signed: true,
        range: [-2147483648, 2147483647],
      },
      members: new Map(),
    });

    scope.defineType("i64", {
      size: 8,
      alignment: 8,
      isArray: [],
      isPointer: 0,
      isPrimitive: true,
      name: "i64",
      info: {
        description: "Signed 64-bit integer",
        signed: true,
        range: [-9223372036854775808, 9223372036854775807],
      },
      members: new Map(),
    });

    scope.defineType("f32", {
      size: 4,
      alignment: 4,
      isArray: [],
      isPointer: 0,
      isPrimitive: true,
      name: "f32",
      info: {
        description: "32-bit floating point number",
        signed: true,
      },
      members: new Map(),
    });

    scope.defineType("f64", {
      size: 8,
      alignment: 8,
      isArray: [],
      isPointer: 0,
      isPrimitive: true,
      name: "f64",
      info: {
        description: "64-bit floating point number",
        signed: true,
      },
      members: new Map(),
    });
  }
  // #endregion
}
