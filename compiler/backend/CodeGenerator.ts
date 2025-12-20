import * as AST from "../common/AST";
import {
  createTypeStructDecl,
  createIntStructDecl,
  createBoolStructDecl,
  createDoubleStructDecl,
  createStringStructDecl,
  PRIMITIVE_STRUCT_MAP,
} from "../middleend/BuiltinTypes";
import { CompilerError } from "../common/CompilerError";
import { Token } from "../frontend/Token";
import { TokenType } from "../frontend/TokenType";

export class CodeGenerator {
  private stdLibPath?: string;
  private useLinkOnceOdrForStdLib: boolean = false;

  constructor(
    options: { stdLibPath?: string; useLinkOnceOdrForStdLib?: boolean } = {},
  ) {
    this.stdLibPath = options.stdLibPath;
    this.useLinkOnceOdrForStdLib = options.useLinkOnceOdrForStdLib || false;
  }

  private output: string[] = [];
  private declarationsOutput: string[] = []; // declarations like struct definitions
  private currentFilePath: string = "unknown"; // Track current file for error reporting
  private registerCount: number = 0;
  private labelCount: number = 0;
  private stackAllocCount: number = 0;
  private stringLiterals: Map<string, string> = new Map(); // content -> global var name
  private currentFunctionReturnType: AST.TypeNode | null = null;
  private currentFunctionName: string | null = null;
  private isMainWithVoidReturn: boolean = false;
  private structLayouts: Map<string, Map<string, number>> = new Map();
  private structMap: Map<string, AST.StructDecl> = new Map();
  private loopStack: { continueLabel: string; breakLabel: string }[] = [];
  private declaredFunctions: Set<string> = new Set();
  private globals: Set<string> = new Set();
  private locals: Set<string> = new Set();
  private localPointers: Map<string, string> = new Map(); // Track variable name -> pointer name mapping
  private localNullFlags: Map<string, string> = new Map(); // Track struct locals -> null-flag pointer
  private pointerToLocal: Map<string, string> = new Map(); // Track pointer variable -> source local for null checking
  private generatedStructs: Set<string> = new Set(); // Track generated monomorphized structs
  private onReturn?: () => void;
  private typeIdMap: Map<string, number> = new Map(); // Type name -> Type ID
  private nextTypeId: number = 10; // Start user types at 10
  private currentTypeMap: Map<string, AST.TypeNode> = new Map(); // For generic function instantiation
  private pendingGenerations: (() => void)[] = [];
  private emittedMemIsZero: boolean = false;
  private generatingFunctionBody: boolean = false; // Track if we're currently generating a function body
  private deferMethodGeneration: boolean = false; // Defer method generation to avoid recursion
  private resolvingMonomorphizedTypes: Set<string> = new Set(); // Track types currently being resolved to prevent re-entry
  private enumVariants: Map<
    string,
    Map<string, { index: number; dataType?: AST.EnumVariantData }>
  > = new Map(); // Track enum variant info
  private generatedEnums: Set<string> = new Set(); // Track generated monomorphized enums
  private enumDeclMap: Map<string, AST.EnumDecl> = new Map(); // Track enum declarations
  private enumDataSizes: Map<string, number> = new Map(); // Track enum data array sizes
  private definedFunctions: Set<string> = new Set(); // Track functions defined in the current module
  private emittedFunctions: Set<string> = new Set(); // Track functions actually emitted to LLVM
  private typeAliasMap: Map<string, AST.TypeAliasDecl> = new Map(); // Track type aliases

  /**
   * Create a CompilerError with proper location information
   */
  private createError(
    message: string,
    node?: AST.ASTNode,
    hint?: string,
  ): CompilerError {
    const location = node?.location || {
      file: this.currentFilePath,
      startLine: 0,
      startColumn: 0,
      endLine: 0,
      endColumn: 0,
    };

    return new CompilerError(message, hint || "", location);
  }

  generate(program: AST.Program, filePath?: string): string {
    if (filePath) {
      this.currentFilePath = filePath;
    }
    this.output = [];
    this.declarationsOutput = [];
    this.stringLiterals.clear();
    this.structLayouts.clear();
    this.structMap.clear();
    this.loopStack = [];
    this.declaredFunctions.clear();
    this.globals.clear();
    this.locals.clear();
    this.generatedStructs.clear();
    this.typeIdMap.clear();
    this.nextTypeId = 10; // Start from 10 to avoid conflicts
    this.emittedMemIsZero = false;
    this.enumVariants.clear();
    this.enumDataSizes.clear();
    this.definedFunctions.clear();
    this.emittedFunctions.clear();
    this.typeAliasMap.clear();

    // Populate structMap with user-defined structs first
    for (const stmt of program.statements) {
      if (stmt.kind === "StructDecl") {
        this.structMap.set(
          (stmt as AST.StructDecl).name,
          stmt as AST.StructDecl,
        );
      }
    }

    // Inject built-in Type struct
    if (!this.structMap.has("Type")) {
      const typeDecl = createTypeStructDecl();
      this.structMap.set("Type", typeDecl);
      this.generateStruct(typeDecl);
    }

    // Inject built-in primitive wrapper structs
    if (!this.structMap.has("Int")) {
      const intDecl = createIntStructDecl();
      this.structMap.set("Int", intDecl);
      this.generateStruct(intDecl);
    }

    if (!this.structMap.has("Bool")) {
      const boolDecl = createBoolStructDecl();
      this.structMap.set("Bool", boolDecl);
      this.generateStruct(boolDecl);
    }

    if (!this.structMap.has("Double")) {
      const doubleDecl = createDoubleStructDecl();
      this.structMap.set("Double", doubleDecl);
      this.generateStruct(doubleDecl);
    }

    if (!this.structMap.has("String")) {
      const stringDecl = createStringStructDecl();
      this.structMap.set("String", stringDecl);
      this.generateStruct(stringDecl);
    }

    // Register generated methods as defined
    // We need to do this for Type struct if it was injected
    const typeDecl = this.structMap.get("Type");
    if (typeDecl) {
      for (const member of typeDecl.members) {
        if (member.kind === "FunctionDecl") {
          const method = member as AST.FunctionDecl;
          const funcName = `Type_${method.name}`;
          const mangled = this.getMangledName(
            funcName,
            method.resolvedType as AST.FunctionTypeNode,
          );
          this.definedFunctions.add(mangled);
          this.declaredFunctions.add(mangled);
        }
      }
    }

    // Collect defined functions to avoid unnecessary declarations
    for (const stmt of program.statements) {
      if (stmt.kind === "TypeAlias") {
        const decl = stmt as AST.TypeAliasDecl;
        this.typeAliasMap.set(decl.name, decl);
      }
      if (stmt.kind === "FunctionDecl") {
        const decl = stmt as AST.FunctionDecl;
        if (decl.resolvedType && decl.resolvedType.kind === "FunctionType") {
          const mangled = this.getMangledName(
            decl.name,
            decl.resolvedType as AST.FunctionTypeNode,
          );
          this.definedFunctions.add(mangled);
        }
      } else if (stmt.kind === "StructDecl") {
        const decl = stmt as AST.StructDecl;
        // Only non-generic structs have methods generated by default
        if (decl.genericParams.length === 0) {
          for (const member of decl.members) {
            if (member.kind === "FunctionDecl") {
              const method = member as AST.FunctionDecl;
              if (
                method.resolvedType &&
                method.resolvedType.kind === "FunctionType"
              ) {
                const funcName = `${decl.name}_${method.name}`;
                const mangled = this.getMangledName(
                  funcName,
                  method.resolvedType as AST.FunctionTypeNode,
                );
                this.definedFunctions.add(mangled);
              }
            }
          }
        }
      } else if (stmt.kind === "EnumDecl") {
        const decl = stmt as AST.EnumDecl;
        // Only non-generic enums have methods generated by default
        if (decl.genericParams.length === 0 && decl.methods) {
          for (const method of decl.methods) {
            if (
              method.resolvedType &&
              method.resolvedType.kind === "FunctionType"
            ) {
              const funcName = `${decl.name}_${method.name}`;
              const mangled = this.getMangledName(
                funcName,
                method.resolvedType as AST.FunctionTypeNode,
              );
              this.definedFunctions.add(mangled);
            }
          }
        }
      }
    }

    // Register built-in NullAccessError struct
    const internalLoc = {
      file: "internal",
      startLine: 0,
      startColumn: 0,
      endLine: 0,
      endColumn: 0,
    };
    const nullAccessErrorDecl: AST.StructDecl = {
      kind: "StructDecl",
      name: "NullAccessError",
      genericParams: [],
      inheritanceList: [],
      members: [
        {
          kind: "StructField",
          name: "message",
          type: {
            kind: "BasicType",
            name: "i8",
            genericArgs: [],
            pointerDepth: 1,
            arrayDimensions: [],
            location: internalLoc,
          },
          location: internalLoc,
        },
        {
          kind: "StructField",
          name: "function",
          type: {
            kind: "BasicType",
            name: "i8",
            genericArgs: [],
            pointerDepth: 1,
            arrayDimensions: [],
            location: internalLoc,
          },
          location: internalLoc,
        },
        {
          kind: "StructField",
          name: "expression",
          type: {
            kind: "BasicType",
            name: "i8",
            genericArgs: [],
            pointerDepth: 1,
            arrayDimensions: [],
            location: internalLoc,
          },
          location: internalLoc,
        },
      ],
      location: internalLoc,
    };
    this.structMap.set("NullAccessError", nullAccessErrorDecl);

    //  Add NullAccessError to struct layouts
    const nullAccessErrorLayout = new Map<string, number>();
    nullAccessErrorLayout.set("message", 0);
    nullAccessErrorLayout.set("function", 1);
    nullAccessErrorLayout.set("expression", 2);
    this.structLayouts.set("NullAccessError", nullAccessErrorLayout);

    // Index Structs for inheritance lookup
    for (const stmt of program.statements) {
      if (stmt.kind === "StructDecl") {
        this.structMap.set(
          (stmt as AST.StructDecl).name,
          stmt as AST.StructDecl,
        );
      } else if (stmt.kind === "SpecDecl") {
        const spec = stmt as AST.SpecDecl;
        this.emitDeclaration(`%struct.${spec.name} = type opaque`);
      }
    }

    this.collectStructLayouts(program);

    // Standard library declarations
    this.emitDeclaration("declare i8* @malloc(i64)");
    this.declaredFunctions.add("malloc");
    this.emitDeclaration("declare void @free(i8*)");
    this.declaredFunctions.add("free");
    this.emitDeclaration("declare void @exit(i32)");
    this.declaredFunctions.add("exit");
    this.emitDeclaration("declare i32 @memcmp(i8*, i8*, i64)");
    this.declaredFunctions.add("memcmp");

    // NullAccessError struct for null object access exceptions
    this.emitDeclaration("%struct.NullAccessError = type { i8*, i8*, i8* }");
    this.structLayouts.set(
      "NullAccessError",
      new Map([
        ["message", 0],
        ["function", 1],
        ["expression", 2],
      ]),
    );

    // fprintf and stderr for null trap error messages (kept for backward compatibility)
    this.emitDeclaration("%struct._IO_FILE = type opaque");
    this.emitDeclaration("@stderr = external global %struct._IO_FILE*");
    this.emitDeclaration("declare i32 @fprintf(%struct._IO_FILE*, i8*, ...)");
    this.declaredFunctions.add("fprintf");

    // Exception Handling Primitives
    // jmp_buf is platform dependent. [32 x i64] is 256 bytes, sufficient for x64.
    this.emitDeclaration(
      `%struct.ExceptionFrame = type { [32 x i64], %struct.ExceptionFrame* }`,
    );
    this.emitDeclaration(
      `@exception_top = weak global %struct.ExceptionFrame* null`,
    );
    this.emitDeclaration(`@exception_value = weak global i64 0`);
    this.emitDeclaration(`@exception_type = weak global i32 0`);

    // Global argc/argv for Args library
    this.emitDeclaration(`@__bpl_argc_value = weak global i32 0`);
    this.emitDeclaration(`@__bpl_argv_value = weak global i8** null`);

    this.emitDeclaration(`declare i32 @setjmp(i8*) returns_twice`);
    this.declaredFunctions.add("setjmp");
    this.emitDeclaration(`declare void @longjmp(i8*, i32) noreturn`);
    this.declaredFunctions.add("longjmp");

    // Helper functions for accessing argc/argv
    this.emitDeclaration(`define linkonce_odr i32 @__bpl_argc() {`);
    this.emitDeclaration(`  %1 = load i32, i32* @__bpl_argc_value`);
    this.emitDeclaration(`  ret i32 %1`);
    this.emitDeclaration(`}`);
    this.emitDeclaration(``);
    this.emitDeclaration(
      `define linkonce_odr i8* @__bpl_argv_get(i32 %index) {`,
    );
    this.emitDeclaration(`  %1 = load i8**, i8*** @__bpl_argv_value`);
    this.emitDeclaration(`  %2 = getelementptr i8*, i8** %1, i32 %index`);
    this.emitDeclaration(`  %3 = load i8*, i8** %2`);
    this.emitDeclaration(`  ret i8* %3`);
    this.emitDeclaration(`}`);
    this.declaredFunctions.add("__bpl_argc");
    this.declaredFunctions.add("__bpl_argv_get");

    this.emitDeclaration("");

    // Helper: memory zero-check function used for 'struct == null' comparisons
    if (!this.emittedMemIsZero) {
      this.emitDeclaration(
        "define linkonce_odr i1 @__bpl_mem_is_zero(i8* %ptr, i64 %n) {",
      );
      this.emitDeclaration("entry:");
      this.emitDeclaration("  %end = getelementptr i8, i8* %ptr, i64 %n");
      this.emitDeclaration("  br label %loop");
      this.emitDeclaration("loop:");
      this.emitDeclaration(
        "  %curr = phi i8* [ %ptr, %entry ], [ %next, %cont ]",
      );
      this.emitDeclaration("  %done = icmp eq i8* %curr, %end");
      this.emitDeclaration("  br i1 %done, label %ret_true, label %check");
      this.emitDeclaration("check:");
      this.emitDeclaration("  %byte = load i8, i8* %curr");
      this.emitDeclaration("  %isnz = icmp ne i8 %byte, 0");
      this.emitDeclaration("  br i1 %isnz, label %ret_false, label %cont");
      this.emitDeclaration("cont:");
      this.emitDeclaration("  %next = getelementptr i8, i8* %curr, i64 1");
      this.emitDeclaration("  br label %loop");
      this.emitDeclaration("ret_true:");
      this.emitDeclaration("  ret i1 1");
      this.emitDeclaration("ret_false:");
      this.emitDeclaration("  ret i1 0");
      this.emitDeclaration("}");
      this.emitDeclaration("");
      this.emittedMemIsZero = true;
    }

    for (const stmt of program.statements) {
      this.generateTopLevel(stmt);
    }

    // Process pending monomorphized functions
    while (this.pendingGenerations.length > 0) {
      const task = this.pendingGenerations.shift()!;
      task();
    }

    let header = "";
    for (const [content, varName] of this.stringLiterals) {
      const len = content.length + 1;
      const escaped = this.escapeString(content);
      header += `${varName} = private unnamed_addr constant [${len} x i8] c"${escaped}\\00", align 1\n`;
    }

    return (
      header +
      "\n" +
      this.declarationsOutput.join("\n") +
      "\n" +
      this.output.join("\n")
    );
  }

  private emit(line: string) {
    this.output.push(line);
  }

  private emitDeclaration(line: string) {
    this.declarationsOutput.push(line);
  }

  private getMangledName(
    name: string,
    type: AST.FunctionTypeNode,
    isExtern: boolean = false,
    genericArgs: AST.TypeNode[] = [],
  ): string {
    if (name === "main" || isExtern) return name;
    let mangled = `${name}_${type.paramTypes.map((t) => this.mangleType(t)).join("_")}`;
    if (genericArgs.length > 0) {
      mangled += "_" + genericArgs.map((t) => this.mangleType(t)).join("_");
    }
    return mangled;
  }

  private getTypeIdFromNode(type: AST.TypeNode): number {
    const typeName = this.resolveType(type); // Get LLVM type name as key

    // Primitives
    if (typeName === "i32") return 1;
    if (typeName === "i1") return 2;
    if (typeName === "double") return 3;
    if (typeName === "i8*") return 4;

    if (!this.typeIdMap.has(typeName)) {
      this.typeIdMap.set(typeName, this.nextTypeId++);
    }
    return this.typeIdMap.get(typeName)!;
  }

  private getAllStructFields(decl: AST.StructDecl): AST.StructField[] {
    let fields: AST.StructField[] = [];
    if (decl.inheritanceList) {
      for (const typeNode of decl.inheritanceList) {
        if (typeNode.kind === "BasicType") {
          // Check for generic instantiation
          if (typeNode.genericArgs && typeNode.genericArgs.length > 0) {
            const baseDecl =
              (typeNode.resolvedDeclaration as AST.StructDecl) ||
              this.structMap.get(typeNode.name);
            if (baseDecl && baseDecl.kind === "StructDecl") {
              // Resolve the monomorphized struct to ensure it exists and we get the concrete name
              const llvmType = this.resolveMonomorphizedType(
                baseDecl,
                typeNode.genericArgs,
              );
              // llvmType is like %struct.Name_Args
              let structName = llvmType;
              if (structName.startsWith("%struct.")) {
                structName = structName.substring(8);
              }
              // Strip pointer if present (shouldn't be for struct type)
              while (structName.endsWith("*")) {
                structName = structName.slice(0, -1);
              }

              const parent = this.structMap.get(structName);
              if (parent) {
                fields = this.getAllStructFields(parent);
                break; // Only one parent struct
              }
            }
          }

          // Try to use resolved declaration first (supports cross-module inheritance)
          if (
            typeNode.resolvedDeclaration &&
            (typeNode.resolvedDeclaration as any).kind === "StructDecl"
          ) {
            const parent = typeNode.resolvedDeclaration as AST.StructDecl;
            fields = this.getAllStructFields(parent);
            break; // Only one parent struct
          }

          // Fallback to name lookup (local structs)
          const parent = this.structMap.get(typeNode.name);
          if (parent) {
            fields = this.getAllStructFields(parent);
            break; // Only one parent struct
          }
        }
      }
    }
    const currentFields = decl.members.filter(
      (m) => m.kind === "StructField",
    ) as AST.StructField[];
    return fields.concat(currentFields);
  }

  private collectStructLayouts(program: AST.Program) {
    for (const stmt of program.statements) {
      if (stmt.kind === "StructDecl") {
        // Only collect non-generic structs initially
        // Generic structs are collected on demand
        // But we need to index layout for non-generic ones
        const decl = stmt as AST.StructDecl;
        if (decl.genericParams.length === 0) {
          const layout = new Map<string, number>();
          const fields = this.getAllStructFields(decl);
          fields.forEach((f, i) => layout.set(f.name, i));
          this.structLayouts.set(decl.name, layout);
        }
      }
    }
  }

  // Add a method to register external layouts (to be called by the driver/compiler)
  public registerStructLayout(name: string, layout: Map<string, number>) {
    this.structLayouts.set(name, layout);
  }

  private generateTopLevel(node: AST.ASTNode) {
    switch (node.kind) {
      case "FunctionDecl":
        this.generateFunction(node as AST.FunctionDecl);
        break;
      case "StructDecl":
        const structDecl = node as AST.StructDecl;
        // Only generate struct if it is NOT generic.
        // Generic structs are templates and generated on-demand.
        if (structDecl.genericParams.length === 0) {
          this.generateStruct(structDecl);
        }
        break;
      case "EnumDecl":
        const enumDecl = node as AST.EnumDecl;
        // Store enum declaration for later use
        this.enumDeclMap.set(enumDecl.name, enumDecl);
        // Only generate enum if it is NOT generic.
        // Generic enums are templates and generated on-demand.
        if (enumDecl.genericParams.length === 0) {
          this.generateEnum(enumDecl);
        }
        break;
      case "Extern":
        this.generateExtern(node as AST.ExternDecl);
        break;
      case "VariableDecl":
        this.generateGlobalVariable(node as AST.VariableDecl);
        break;
      case "TypeAlias":
        // Type aliases are handled by the TypeChecker and don't generate code directly
        break;
      case "Import":
        // Imports are resolved by ModuleResolver and don't generate code directly
        break;
      case "Export":
        // Exports are metadata for module resolution and don't generate code directly
        break;
      case "SpecDecl":
        const spec = node as AST.SpecDecl;
        for (const method of spec.methods) {
          const funcName = `${spec.name}_${method.name}`;
          if (this.declaredFunctions.has(funcName)) continue;
          this.declaredFunctions.add(funcName);
          this.emitDeclaration(
            `define void @${funcName}(%struct.${spec.name}* %this) { ret void }`,
          );
        }
        break;
      default:
        console.warn(`Unhandled top-level node kind: ${node.kind}`);
        break;
    }
  }

  private generateExtern(decl: AST.ExternDecl) {
    const name = decl.name;
    if (this.declaredFunctions.has(name)) return;
    this.declaredFunctions.add(name);

    const funcType = decl.resolvedType as AST.FunctionTypeNode;
    const retType = this.resolveType(funcType.returnType);

    const params = funcType.paramTypes.map((p) => this.resolveType(p));
    if (decl.isVariadic) {
      params.push("...");
    }

    const paramStr = params.join(", ");
    this.emitDeclaration(`declare ${retType} @${name}(${paramStr})`);
    this.emitDeclaration("");
  }

  private generateStruct(decl: AST.StructDecl, mangledName?: string) {
    const structName = mangledName || decl.name;

    // Avoid re-emitting
    if (this.generatedStructs.has(structName)) return;
    this.generatedStructs.add(structName);

    // %struct.Name = type { ... }
    const fields = this.getAllStructFields(decl);

    // We need to resolve field types.
    // If this is a monomorphized struct (generic instance), the fields might use generic types.
    // The 'decl' passed here should effectively be the instantiated version with types substituted.
    // However, for simplicity, 'resolveType' handles substitution if 'decl' is a virtual AST node?
    // No, standard resolveType relies on resolving AST nodes.
    // When we call generateStruct for Box<int>, we should have already substituted T with int in the fields.

    const fieldTypes = fields
      .map((f) => this.resolveType(f.resolvedType || f.type))
      .join(", ");

    // Add hidden null-bit field at the end (i1 = 1 bit boolean)
    const allFieldTypes = fieldTypes ? `${fieldTypes}, i1` : `i1`;
    this.emitDeclaration(`%struct.${structName} = type { ${allFieldTypes} }`);
    this.emitDeclaration("");

    // Register layout - null_bit is always the last field
    const layout = new Map<string, number>();
    fields.forEach((f, i) => layout.set(f.name, i));
    layout.set("__null_bit__", fields.length); // Hidden null bit field
    this.structLayouts.set(structName, layout);

    // Generate methods
    // Only generate methods for non-generic structs (standard structs).
    // For monomorphized structs (when mangledName is provided), methods are queued
    // separately in resolveMonomorphizedType() with proper type substitution.
    if (decl.genericParams.length === 0 && !mangledName) {
      const methods = decl.members.filter(
        (m) => m.kind === "FunctionDecl",
      ) as AST.FunctionDecl[];

      for (const method of methods) {
        const originalName = method.name;
        method.name = `${structName}_${method.name}`;
        this.generateFunction(method, decl);
        method.name = originalName;
      }
    }
  }

  private generateEnum(decl: AST.EnumDecl, mangledName?: string) {
    const enumName = mangledName || decl.name;

    // Avoid re-emitting
    if (this.generatedStructs.has(enumName)) return;
    this.generatedStructs.add(enumName);

    // Calculate maximum variant data size with proper alignment
    let maxSize = 0;
    for (const variant of decl.variants) {
      let variantSize = 0;

      if (variant.dataType) {
        if (variant.dataType.kind === "EnumVariantTuple") {
          // Tuple variant: calculate size with alignment
          let offset = 0;
          for (const fieldType of variant.dataType.types) {
            const llvmType = this.resolveType(fieldType);
            const fieldSize = this.getTypeSize(llvmType);

            // Align offset based on field size
            const alignment =
              fieldSize >= 8 ? 8 : fieldSize >= 4 ? 4 : fieldSize >= 2 ? 2 : 1;
            if (offset % alignment !== 0) {
              offset = Math.ceil(offset / alignment) * alignment;
            }

            offset += fieldSize;
          }
          variantSize = offset;
        } else if (variant.dataType.kind === "EnumVariantStruct") {
          // Struct variant: calculate size with alignment
          let offset = 0;
          for (const field of variant.dataType.fields) {
            const llvmType = this.resolveType(field.type);
            const fieldSize = this.getTypeSize(llvmType);

            // Align offset based on field size
            const alignment =
              fieldSize >= 8 ? 8 : fieldSize >= 4 ? 4 : fieldSize >= 2 ? 2 : 1;
            if (offset % alignment !== 0) {
              offset = Math.ceil(offset / alignment) * alignment;
            }

            offset += fieldSize;
          }
          variantSize = offset;
        }
      }
      // Unit variants have size 0

      if (variantSize > maxSize) {
        maxSize = variantSize;
      }
    }

    // Generate enum as: { i32 tag, [maxSize x i8] data }
    // If maxSize is 0 (all unit variants), just use { i32 }
    const enumType =
      maxSize > 0
        ? `%enum.${enumName} = type { i32, [${maxSize} x i8] }`
        : `%enum.${enumName} = type { i32 }`;

    this.emitDeclaration(enumType);
    this.emitDeclaration("");

    // Register layout for later use
    const layout = new Map<string, number>();
    layout.set("__tag__", 0); // Discriminant is always at index 0
    if (maxSize > 0) {
      layout.set("__data__", 1); // Data union is at index 1
    }
    this.structLayouts.set(enumName, layout);

    // Store the data array size for equality comparisons
    if (maxSize > 0) {
      this.enumDataSizes.set(enumName, maxSize);
    }

    // Store variant information for later use in pattern matching
    const variantInfo = new Map<
      string,
      { index: number; dataType?: AST.EnumVariantData }
    >();
    decl.variants.forEach((v, i) => {
      variantInfo.set(v.name, { index: i, dataType: v.dataType });
    });
    this.enumVariants.set(enumName, variantInfo);

    // Generate methods
    // Only generate methods for non-generic enums.
    // For monomorphized enums (when mangledName is provided), methods are queued
    // separately in instantiateGenericEnum() with proper type substitution.
    if (decl.genericParams.length === 0 && !mangledName && decl.methods) {
      for (const method of decl.methods) {
        const originalName = method.name;
        method.name = `${enumName}_${method.name}`;
        this.generateFunction(method, decl);
        method.name = originalName;
      }
    }
  }

  private instantiateGenericEnum(
    enumName: string,
    genericArgs: AST.TypeNode[],
  ): string {
    // Create mangled name for the instantiated enum
    const mangledName = this.mangleGenericTypeName(enumName, genericArgs);

    // Check if already generated
    if (this.generatedEnums.has(mangledName)) {
      return mangledName;
    }
    this.generatedEnums.add(mangledName);

    // Get the generic enum declaration
    const decl = this.enumDeclMap.get(enumName);
    if (!decl) {
      throw new Error(`Generic enum ${enumName} not found`);
    }

    // Build type substitution map
    const typeMap = new Map<string, AST.TypeNode>();
    if (decl.genericParams) {
      for (
        let i = 0;
        i < decl.genericParams.length && i < genericArgs.length;
        i++
      ) {
        typeMap.set(decl.genericParams[i]!.name, genericArgs[i]!);
      }
    }

    // Create a copy of the enum with substituted types
    const instantiatedDecl: AST.EnumDecl = {
      ...decl,
      name: mangledName,
      genericParams: [], // Instantiated enums have no generic params
      variants: decl.variants.map((v) => ({
        ...v,
        dataType: v.dataType
          ? v.dataType.kind === "EnumVariantTuple"
            ? {
                ...v.dataType,
                types: v.dataType.types.map((t) =>
                  this.substituteType(t, typeMap),
                ),
              }
            : v.dataType.kind === "EnumVariantStruct"
              ? {
                  ...v.dataType,
                  fields: v.dataType.fields.map((f) => ({
                    name: f.name,
                    type: this.substituteType(f.type, typeMap),
                  })),
                }
              : v.dataType
          : undefined,
      })),
    };

    // Generate the instantiated enum
    this.generateEnum(instantiatedDecl, mangledName);

    return mangledName;
  }

  private mangleGenericTypeName(
    baseName: string,
    genericArgs: AST.TypeNode[],
  ): string {
    if (genericArgs.length === 0) return baseName;

    const argNames = genericArgs.map((arg) => {
      if (arg.kind === "BasicType") {
        const basicArg = arg as AST.BasicTypeNode;
        let name = basicArg.name;

        // Normalize primitive type names to their LLVM canonical form
        const primitiveMap: Record<string, string> = {
          int: "i32",
          uint: "i32",
          u32: "i32",
          char: "i8",
          uchar: "i8",
          u8: "i8",
          short: "i16",
          ushort: "i16",
          u16: "i16",
          long: "i64",
          ulong: "i64",
          u64: "i64",
          bool: "i1",
        };

        const normalizedName = primitiveMap[name];
        if (normalizedName) {
          name = normalizedName;
        }

        if (basicArg.genericArgs && basicArg.genericArgs.length > 0) {
          name = this.mangleGenericTypeName(name, basicArg.genericArgs);
        }
        if (basicArg.pointerDepth > 0) {
          name += "_ptr".repeat(basicArg.pointerDepth);
        }
        return name;
      }
      return "unknown";
    });

    return `${baseName}_${argNames.join("_")}`;
  }

  private getTypeSize(llvmType: string): number {
    // Estimate size in bytes for common LLVM types
    // This is a simplification - actual sizes may vary
    if (llvmType === "i1") return 1;
    if (llvmType === "i8") return 1;
    if (llvmType === "i16") return 2;
    if (llvmType === "i32") return 4;
    if (llvmType === "i64") return 8;
    if (llvmType === "double") return 8;
    if (llvmType === "float") return 4;
    if (llvmType.endsWith("*")) return 8; // Pointers are 8 bytes
    if (llvmType.startsWith("%struct.")) return 8; // Approximate struct size
    if (llvmType.startsWith("%enum.")) return 8; // Approximate enum size
    return 8; // Default fallback
  }

  private getDataArraySize(enumTypeName: string): number {
    // Extract the data array size from enum type string like "%enum.Color = type { i32, [16 x i8] }"
    // or from just the type name "%enum.Color"
    const match = enumTypeName.match(/\[(\d+) x i8\]/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    // If no match, the enum might not have a data field (unit-only enum)
    return 0;
  }

  private generateEnumVariantConstruction(
    enumDecl: AST.EnumDecl,
    variant: AST.EnumVariant,
    variantIndex: number,
    genericArgs?: AST.TypeNode[],
  ): string {
    let enumName = enumDecl.name;

    // If generic args are provided, instantiate the generic enum
    if (genericArgs && genericArgs.length > 0) {
      enumName = this.instantiateGenericEnum(enumDecl.name, genericArgs);
    }

    const enumType = `%enum.${enumName}`;

    // For now, only handle unit variants (no associated data)
    // TODO: Handle tuple and struct variants with data
    if (variant.dataType) {
      throw this.createError(
        `Enum variants with associated data are not yet supported in code generation`,
        variant,
        `Variant '${variant.name}' has associated data. Only unit variants are currently supported.`,
      );
    }

    // Allocate space for the enum value
    const enumPtr = this.newRegister();
    this.emit(`  ${enumPtr} = alloca ${enumType}`);

    // Get pointer to tag field (index 0)
    const tagPtr = this.newRegister();
    this.emit(
      `  ${tagPtr} = getelementptr inbounds ${enumType}, ${enumType}* ${enumPtr}, i32 0, i32 0`,
    );

    // Store the variant index as the discriminant
    this.emit(`  store i32 ${variantIndex}, i32* ${tagPtr}`);

    // Load and return the enum value
    const result = this.newRegister();
    this.emit(`  ${result} = load ${enumType}, ${enumType}* ${enumPtr}`);

    return result;
  }

  private mangleType(type: AST.TypeNode): string {
    if (type.kind === "BasicType") {
      let name = type.name;

      // Normalize aliases to match TypeChecker and ensure consistent mangling
      switch (name) {
        case "int":
          name = "i32";
          break;
        case "uint":
          name = "u32";
          break;
        case "float":
          name = "double";
          break;
        case "bool":
          name = "i1";
          break;
        case "char":
          name = "i8";
          break;
        case "uchar":
          name = "u8";
          break;
        case "short":
          name = "i16";
          break;
        case "ushort":
          name = "u16";
          break;
        case "long":
          name = "i64";
          break;
        case "ulong":
          name = "u64";
          break;
      }

      // Handle generic args in mangling
      if (type.genericArgs.length > 0) {
        const args = type.genericArgs.map((t) => this.mangleType(t)).join("_");
        name = `${name}_${args}`;
      }

      // Cleanup name similarly to before but on AST level names
      if (name.includes(".")) name = name.replace(/\./g, "_");

      // Basic type pointers/arrays
      let suffix = "";
      for (let i = 0; i < type.pointerDepth; i++) suffix += "_ptr";
      for (let d of type.arrayDimensions) suffix += `_arr_${d}_`;

      return `${name}${suffix}`;
    } else if (type.kind === "FunctionType") {
      return "fn"; // simplified mangling for fn types
    }
    return "unknown";
  }

  private resolveMonomorphizedType(
    baseStruct: AST.StructDecl,
    genericArgs: AST.TypeNode[],
  ): string {
    // 1. Mangle Name
    const argNames = genericArgs
      .map((arg) => {
        // Use lightweight mangling to avoid recursive resolveType for generic args
        return this.mangleType(arg);
      })
      .join("_");

    const mangledName = `${baseStruct.name}_${argNames}`;

    // 2. Check if exists
    if (this.generatedStructs.has(mangledName)) {
      return `%struct.${mangledName}`;
    }
    // Also check structMap in case it was created but not yet generated (e.g. recursive reference)
    if (this.structMap.has(mangledName)) {
      return `%struct.${mangledName}`;
    }

    // 3. Check if we're already resolving this type (prevent re-entry during method generation)
    if (this.resolvingMonomorphizedTypes.has(mangledName)) {
      // We're already resolving this type - just return the struct name
      // The struct definition and methods will be completed by the outer call
      return `%struct.${mangledName}`;
    }

    // 4. Mark that we're resolving this type to prevent re-entry
    this.resolvingMonomorphizedTypes.add(mangledName);

    try {
      // 5. Instantiate
      // Create a map of generic param names to concrete argument types
      const typeMap = new Map<string, AST.TypeNode>();
      if (baseStruct.genericParams.length !== genericArgs.length) {
        throw this.createError(
          `Generic argument mismatch for struct '${baseStruct.name}'`,
          undefined,
          `Expected ${baseStruct.genericParams.length} generic arguments, but got ${genericArgs.length}`,
        );
      }
      for (let i = 0; i < baseStruct.genericParams.length; i++) {
        typeMap.set(baseStruct.genericParams[i]!.name.trim(), genericArgs[i]!);
      }

      // Clone and substitute fields
      const instantiatedMembers = baseStruct.members.map((m) => {
        if (m.kind === "StructField") {
          const field = m as AST.StructField;
          return {
            ...field,
            type: this.substituteType(field.type, typeMap),
            resolvedType: undefined, // Force re-resolution
            typeMap,
          } as AST.StructField;
        }
        return m;
      });

      // Handle generic inheritance
      let instantiatedInheritanceList: AST.TypeNode[] = [];
      if (baseStruct.inheritanceList) {
        instantiatedInheritanceList = baseStruct.inheritanceList.map((t) => {
          let instantiatedType = this.substituteType(t, typeMap);

          // Force resolution of parent to ensure it exists and we get the concrete name
          // Only for BasicType (structs/specs)
          if (instantiatedType.kind === "BasicType") {
            const parentLlvmType = this.resolveType(instantiatedType);
            let parentName = parentLlvmType;
            if (parentName.startsWith("%struct.")) {
              parentName = parentName.substring(8);
              while (parentName.endsWith("*"))
                parentName = parentName.slice(0, -1);
            }
            instantiatedType = {
              ...instantiatedType,
              name: parentName,
              genericArgs: [], // Cleared because name is now concrete
              resolvedDeclaration: undefined, // Clear resolved declaration to force name lookup
            };
          }
          return instantiatedType;
        });
      }

      const instantiatedStruct: AST.StructDecl = {
        ...baseStruct,
        name: mangledName, // Update name
        genericParams: [], // Concrete now
        inheritanceList: instantiatedInheritanceList,
        members: instantiatedMembers.filter((m) => m.kind === "StructField"), // Only fields in struct def
      };

      // Register in structMap so it can be looked up by name (for inheritance etc)
      this.structMap.set(mangledName, instantiatedStruct);

      this.generateStruct(instantiatedStruct, mangledName);

      // Queue generation of methods
      const methods = baseStruct.members.filter(
        (m) => m.kind === "FunctionDecl",
      ) as AST.FunctionDecl[];
      for (const method of methods) {
        // If method is not generic, generate it now (monomorphized)
        if (method.genericParams.length === 0) {
          // Pre-calculate mangled name and mark as defined to prevent redundant declarations
          const funcType = method.resolvedType as AST.FunctionTypeNode;
          const substitutedFuncType = this.substituteType(
            funcType,
            typeMap,
          ) as AST.FunctionTypeNode;
          const methodName = `${mangledName}_${method.name}`;
          const fullMangledName = this.getMangledName(
            methodName,
            substitutedFuncType,
            false,
            [],
          );
          this.definedFunctions.add(fullMangledName);

          this.pendingGenerations.push(() => {
            const oldName = method.name;
            method.name = `${mangledName}_${method.name}`;
            const prevMap = this.currentTypeMap;
            this.currentTypeMap = typeMap;

            // We pass instantiatedStruct as parent to generateFunction
            // This correctly sets up "this" type and destructor chaining
            this.generateFunction(method, instantiatedStruct);

            this.currentTypeMap = prevMap;
            method.name = oldName;
          });
        }
        // If method IS generic, we don't generate it here.
        // It will be generated when called, via resolveMonomorphizedFunction.
      }

      // Mark as generated (even though methods are pending) to prevent re-entry
      // The struct definition itself is complete, methods will be generated from pendingGenerations
      this.generatedStructs.add(mangledName);

      return `%struct.${mangledName}`;
    } finally {
      // Always remove from tracking set when done
      this.resolvingMonomorphizedTypes.delete(mangledName);
    }
  }

  private resolveMonomorphizedFunction(
    decl: AST.FunctionDecl,
    genericArgs: AST.TypeNode[],
    contextMap?: Map<string, AST.TypeNode>,
    namePrefix?: string,
  ): string {
    // 1. Substitute generic args in case they are also generic
    const concreteArgs = genericArgs.map((arg) =>
      this.substituteType(arg, this.currentTypeMap),
    );

    // 2. Create Instance Map
    const instanceMap = new Map<string, AST.TypeNode>(this.currentTypeMap);
    if (contextMap) {
      for (const [k, v] of contextMap) {
        instanceMap.set(k, v);
      }
    }
    if (decl.genericParams.length !== concreteArgs.length) {
      throw this.createError(
        `Generic argument mismatch for function '${decl.name}'`,
        decl,
        `Expected ${decl.genericParams.length} generic arguments, but got ${concreteArgs.length}`,
      );
    }
    for (let i = 0; i < decl.genericParams.length; i++) {
      instanceMap.set(decl.genericParams[i]!.name, concreteArgs[i]!);
    }

    // 3. Substitute Function Type to get correct mangled name
    const substitutedType = this.substituteType(
      decl.resolvedType as AST.FunctionTypeNode,
      instanceMap,
    ) as AST.FunctionTypeNode;

    // 4. Calculate Mangled Name
    let mangledName = this.getMangledName(
      decl.name,
      substitutedType,
      false,
      concreteArgs,
    );
    if (namePrefix) {
      mangledName = `${namePrefix}_${this.getMangledName(
        decl.name,
        substitutedType,
        false,
        concreteArgs,
      )}`;
    }

    // 5. Check Cache
    if (this.declaredFunctions.has(mangledName)) {
      return mangledName;
    }
    this.declaredFunctions.add(mangledName);

    // 6. Queue Generation
    this.pendingGenerations.push(() => {
      // Create a specialized declaration
      const newDecl: AST.FunctionDecl = {
        ...decl,
        name: decl.name,
        resolvedType: substitutedType,
      };

      if (namePrefix) {
        newDecl.name = `${namePrefix}_${decl.name}`;
      }

      const prevMap = this.currentTypeMap;
      this.currentTypeMap = instanceMap;

      this.generateFunction(newDecl);

      this.currentTypeMap = prevMap;
    });

    return mangledName;
  }

  private substituteType(
    type: AST.TypeNode,
    map: Map<string, AST.TypeNode>,
  ): AST.TypeNode {
    if (type.kind === "BasicType") {
      // Check map by iterating keys to ensure string matching works
      for (const [key, value] of map.entries()) {
        if (key === type.name.trim()) {
          const mapped = value;
          // Merge pointer depth and array dims
          if (mapped.kind === "BasicType") {
            return {
              ...mapped,
              pointerDepth: mapped.pointerDepth + type.pointerDepth,
              arrayDimensions: [
                ...mapped.arrayDimensions,
                ...type.arrayDimensions,
              ],
            };
          }
          return mapped;
        }
      }

      // Recursively substitute generic args
      return {
        ...type,
        genericArgs: type.genericArgs.map((arg) =>
          this.substituteType(arg, map),
        ),
      };
    } else if (type.kind === "FunctionType") {
      return {
        ...type,
        returnType: this.substituteType(type.returnType, map),
        paramTypes: type.paramTypes.map((p) => this.substituteType(p, map)),
      };
    }
    return type;
  }

  private generateFunction(
    decl: AST.FunctionDecl,
    parentStruct?: AST.StructDecl | AST.EnumDecl,
  ) {
    // Skip generic templates unless we are instantiating them (map is populated)
    if (decl.genericParams.length > 0) {
      const isInstantiating = decl.genericParams.every((p) =>
        this.currentTypeMap.has(p.name),
      );
      if (!isInstantiating) return;
    }

    this.registerCount = 0;
    this.labelCount = 0;
    this.stackAllocCount = 0;
    this.currentFunctionReturnType = decl.returnType;
    this.currentFunctionName = decl.name;
    this.locals.clear();
    this.localPointers.clear();
    this.localNullFlags.clear();
    this.pointerToLocal.clear();

    // Setup destructor chaining
    let parentStructType: AST.TypeNode | undefined;
    if (
      parentStruct &&
      parentStruct.kind === "StructDecl" &&
      parentStruct.inheritanceList
    ) {
      for (const t of parentStruct.inheritanceList) {
        if (t.kind === "BasicType" && this.structMap.has(t.name)) {
          parentStructType = t;
          break;
        }
      }
    }

    if (
      parentStruct &&
      parentStruct.kind === "StructDecl" &&
      decl.name === `${parentStruct.name}_destroy` &&
      parentStructType
    ) {
      this.onReturn = () => {
        this.emitParentDestroy(parentStruct as AST.StructDecl, decl);
      };
    } else {
      this.onReturn = undefined;
    }

    let name = decl.name;
    const funcType = decl.resolvedType as AST.FunctionTypeNode;
    if (decl.resolvedType && decl.resolvedType.kind === "FunctionType") {
      let genericArgs: AST.TypeNode[] = [];
      if (decl.genericParams.length > 0) {
        genericArgs = decl.genericParams.map(
          (p) => this.currentTypeMap.get(p.name)!,
        );
      }
      // Substitute generic types in function signature before mangling
      const substitutedFuncType = this.substituteType(
        funcType,
        this.currentTypeMap,
      ) as AST.FunctionTypeNode;
      name = this.getMangledName(
        decl.name,
        substitutedFuncType,
        false,
        genericArgs,
      );
    }

    // Prevent duplicate generation
    if (this.emittedFunctions.has(name)) {
      return;
    }
    this.emittedFunctions.add(name);

    let retType = this.resolveType(funcType.returnType);

    // Special case: if this is main with void return, change to i32 for exit code
    this.isMainWithVoidReturn = decl.name === "main" && retType === "void";
    if (this.isMainWithVoidReturn) {
      retType = "i32";
    }

    // Special handling for main function to accept argc/argv
    let params: string;
    if (decl.name === "main") {
      params = "i32 %argc, i8** %argv";
    } else {
      params = decl.params
        .map((p, i) => {
          const type = this.resolveType(funcType.paramTypes[i]!);
          const name = `%${p.name}`;
          return `${type} ${name}`;
        })
        .join(", ");
    }

    let linkage = "";
    if (name.startsWith("Type_")) {
      linkage = "linkonce_odr ";
    } else if (
      this.useLinkOnceOdrForStdLib &&
      this.stdLibPath &&
      decl.location &&
      decl.location.file &&
      decl.location.file.startsWith(this.stdLibPath)
    ) {
      linkage = "linkonce_odr ";
    }
    this.emit(`define ${linkage}${retType} @${name}(${params}) {`);
    this.emit("entry:");

    // Store argc/argv in global variables for main function
    if (name === "main") {
      this.emit(`  store i32 %argc, i32* @__bpl_argc_value`);
      this.emit(`  store i8** %argv, i8*** @__bpl_argv_value`);
    }

    // Allocate stack space for parameters to make them mutable
    for (let i = 0; i < decl.params.length; i++) {
      const param = decl.params[i]!;
      this.locals.add(param.name);
      const type = this.resolveType(funcType.paramTypes[i]!);
      const paramReg = `%${param.name}`;
      const stackAddr = this.allocateStack(param.name, type);
      this.emit(`  store ${type} ${paramReg}, ${type}* ${stackAddr}`);

      // For struct-value parameters, extract the __null_bit__ field to detect if null was passed
      const flagPtr = this.localNullFlags.get(param.name);
      if (flagPtr) {
        // Load the struct and extract __null_bit__ field
        // __null_bit__ = 1 means valid, 0 means null
        // The flag stores the validity directly (1=valid, 0=null)
        const loaded = this.newRegister();
        this.emit(`  ${loaded} = load ${type}, ${type}* ${stackAddr}`);

        // Get the struct layout to find __null_bit__ index
        const structName = (funcType.paramTypes[i] as AST.BasicTypeNode)?.name;
        const layout = this.structLayouts.get(structName);
        const nullBitIndex = layout ? layout.get("__null_bit__") : -1;

        if (nullBitIndex !== undefined && nullBitIndex >= 0) {
          const extracted = this.newRegister();
          this.emit(
            `  ${extracted} = extractvalue ${type} ${loaded}, ${nullBitIndex}`,
          );
          // Store __null_bit__ directly (1=valid, 0=null)
          this.emit(`  store i1 ${extracted}, i1* ${flagPtr}`);
        }
      }
    }

    this.generateBlock(decl.body);

    // Add implicit return for void functions if missing
    const lastLine =
      this.output.length > 0 ? this.output[this.output.length - 1]! : "";

    // Handle implicit returns based on function type
    if (!lastLine.trim().startsWith("ret")) {
      if (this.onReturn) this.onReturn();

      if (this.isMainWithVoidReturn) {
        // Main was declared void but we changed it to i32, return 0
        this.emit("  ret i32 0");
      } else if (retType === "void") {
        this.emit("  ret void");
      } else if (retType.endsWith("*")) {
        // Pointer type - return null
        this.emit(`  ret ${retType} null`);
      } else if (retType === "i32" || retType === "i64") {
        // Non-void function without explicit return, return 0 as default
        this.emit(`  ret ${retType} 0`);
      } else {
        this.emit("  unreachable");
      }
    }

    this.emit("}");
    this.emit("");
  }

  private generateBlock(block: AST.BlockStmt) {
    for (const stmt of block.statements) {
      this.generateStatement(stmt);
    }
  }

  private generateStatement(stmt: AST.Statement) {
    switch (stmt.kind) {
      case "VariableDecl":
        this.generateVariableDecl(stmt as AST.VariableDecl);
        break;
      case "TypeAlias":
        // Local type alias - add to map for resolution
        const aliasDecl = stmt as AST.TypeAliasDecl;
        this.typeAliasMap.set(aliasDecl.name, aliasDecl);
        break;
      case "Return":
        this.generateReturn(stmt as AST.ReturnStmt);
        break;
      case "ExpressionStmt":
        this.generateExpression((stmt as AST.ExpressionStmt).expression);
        break;
      case "If":
        this.generateIf(stmt as AST.IfStmt);
        break;
      case "Loop":
        this.generateLoop(stmt as AST.LoopStmt);
        break;
      case "Block":
        this.generateBlock(stmt as AST.BlockStmt);
        break;
      case "Break":
        this.generateBreak(stmt as AST.BreakStmt);
        break;
      case "Continue":
        this.generateContinue(stmt as AST.ContinueStmt);
        break;
      case "Switch":
        this.generateSwitch(stmt as AST.SwitchStmt);
        break;
      case "Try":
        this.generateTry(stmt as AST.TryStmt);
        break;
      case "Throw":
        this.generateThrow(stmt as AST.ThrowStmt);
        break;
      default:
        console.warn(`Unhandled statement kind: ${stmt.kind}`);
        break;
    }
  }

  private generateTry(stmt: AST.TryStmt) {
    const catchLabel = this.newLabel("try.catch");
    const endLabel = this.newLabel("try.end");

    // 1. Allocate ExceptionFrame
    const framePtr = this.allocateStack(
      "exception_frame",
      "%struct.ExceptionFrame",
    );

    // 2. Link previous frame
    const prevFramePtrReg = this.newRegister();
    this.emit(
      `  ${prevFramePtrReg} = load %struct.ExceptionFrame*, %struct.ExceptionFrame** @exception_top`,
    );

    const prevFieldPtr = this.newRegister();
    this.emit(
      `  ${prevFieldPtr} = getelementptr inbounds %struct.ExceptionFrame, %struct.ExceptionFrame* ${framePtr}, i32 0, i32 1`,
    );
    this.emit(
      `  store %struct.ExceptionFrame* ${prevFramePtrReg}, %struct.ExceptionFrame** ${prevFieldPtr}`,
    );

    // 3. Set new top
    this.emit(
      `  store %struct.ExceptionFrame* ${framePtr}, %struct.ExceptionFrame** @exception_top`,
    );

    // 4. Call setjmp on buf
    const bufFieldPtr = this.newRegister();
    this.emit(
      `  ${bufFieldPtr} = getelementptr inbounds %struct.ExceptionFrame, %struct.ExceptionFrame* ${framePtr}, i32 0, i32 0`,
    );

    // Cast to i8* for setjmp
    const bufVoidPtr = this.newRegister();
    this.emit(`  ${bufVoidPtr} = bitcast [32 x i64]* ${bufFieldPtr} to i8*`);

    const setjmpResult = this.newRegister();
    this.emit(`  ${setjmpResult} = call i32 @setjmp(i8* ${bufVoidPtr})`);

    // 5. Check result
    const isException = this.newRegister();
    this.emit(`  ${isException} = icmp ne i32 ${setjmpResult}, 0`);

    const tryBodyLabel = this.newLabel("try.body");
    this.emit(
      `  br i1 ${isException}, label %${catchLabel}, label %${tryBodyLabel}`,
    );

    // Try Body
    this.emit(`${tryBodyLabel}:`);
    this.generateBlock(stmt.tryBlock);

    // On success, pop stack
    if (!this.isTerminator(this.output[this.output.length - 1] || "")) {
      this.emit(
        `  store %struct.ExceptionFrame* ${prevFramePtrReg}, %struct.ExceptionFrame** @exception_top`,
      );
      this.emit(`  br label %${endLabel}`);
    }

    // Catch Block
    this.emit(`${catchLabel}:`);
    // NOTE: setjmp returning != 0 means we are back here.
    // The exception_top is still pointing to our frame because longjmp unwound to here.
    // We must restore exception_top to prev before executing catch block (so catching doesn't loop?)
    // Or we keep it if we want to rethrow?
    // Standard practice: pop it.
    this.emit(
      `  store %struct.ExceptionFrame* ${prevFramePtrReg}, %struct.ExceptionFrame** @exception_top`,
    );

    // Dispatch based on type
    const exceptionTypeReg = this.newRegister();
    this.emit(`  ${exceptionTypeReg} = load i32, i32* @exception_type`);

    // Generate checks for each catch clause
    // catch (e: int) checks if @exception_type == 1

    // Let's gather labels first.
    const clauseLabels = stmt.catchClauses.map((_, i) => ({
      check: this.newLabel(`catch.check.${i}`),
      body: this.newLabel(`catch.body.${i}`),
    }));

    // Jump to first check or end
    if (stmt.catchClauses.length > 0) {
      this.emit(`  br label %${clauseLabels[0]!.check}`);
    } else {
      // No clauses? Re-throw? Or go to catchOther?
      if (stmt.catchOther) {
        const anyLabel = this.newLabel("catch.any");
        this.emit(`  br label %${anyLabel}`);
        this.emit(`${anyLabel}:`);
        this.generateBlock(stmt.catchOther);
        this.emit(`  br label %${endLabel}`);
      } else {
        // Rethrow if no handler
        this.emit(`  call void @exit(i32 1)`); // Unhandled
        this.emit(`  unreachable`);
      }
    }

    for (let i = 0; i < stmt.catchClauses.length; i++) {
      const clause = stmt.catchClauses[i]!;
      const labels = clauseLabels[i]!;
      const nextTarget =
        i < stmt.catchClauses.length - 1
          ? clauseLabels[i + 1]!.check
          : stmt.catchOther
            ? this.newLabel("catch.other")
            : endLabel;

      this.emit(`${labels.check}:`);
      const targetTypeId = this.getTypeIdFromNode(clause.type);
      const typeMatch = this.newRegister();
      this.emit(
        `  ${typeMatch} = icmp eq i32 ${exceptionTypeReg}, ${targetTypeId}`,
      );
      this.emit(
        `  br i1 ${typeMatch}, label %${labels.body}, label %${nextTarget}`,
      );

      this.emit(`${labels.body}:`);
      // Bind variable
      const targetTypeStr = this.resolveType(clause.type);
      const valI64 = this.newRegister();
      this.emit(`  ${valI64} = load i64, i64* @exception_value`);

      // For structs, load from heap. For primitives, cast from i64.
      if (targetTypeStr.startsWith("%struct.")) {
        // Convert i64 pointer back to struct pointer
        const structPtr = this.newRegister();
        this.emit(
          `  ${structPtr} = inttoptr i64 ${valI64} to ${targetTypeStr}*`,
        );

        // Load struct from heap
        const structVal = this.newRegister();
        this.emit(
          `  ${structVal} = load ${targetTypeStr}, ${targetTypeStr}* ${structPtr}`,
        );

        // Allocate local and store
        const localVar = this.allocateStack(clause.variable, targetTypeStr);
        this.emit(
          `  store ${targetTypeStr} ${structVal}, ${targetTypeStr}* ${localVar}`,
        );

        // Extract __null_bit__ field to update the null flag
        const flagPtr = this.localNullFlags.get(clause.variable);
        if (flagPtr) {
          const structName = (clause.type as AST.BasicTypeNode)?.name;
          const layout = this.structLayouts.get(structName);
          const nullBitIndex = layout ? layout.get("__null_bit__") : -1;

          if (nullBitIndex !== undefined && nullBitIndex >= 0) {
            const extracted = this.newRegister();
            this.emit(
              `  ${extracted} = extractvalue ${targetTypeStr} ${structVal}, ${nullBitIndex}`,
            );
            // Store __null_bit__ directly in the flag (1=valid, 0=null)
            this.emit(`  store i1 ${extracted}, i1* ${flagPtr}`);
          }
        }
      } else {
        // For primitive types, cast to i64
        const convertedVal = this.emitCast(
          valI64,
          "i64",
          targetTypeStr,
          {
            kind: "BasicType",
            name: "i64",
            genericArgs: [],
            pointerDepth: 0,
            arrayDimensions: [],
            location: clause.location,
          } as AST.BasicTypeNode,
          clause.type,
        );

        // Allocate local
        const localVar = this.allocateStack(clause.variable, targetTypeStr);
        this.emit(
          `  store ${targetTypeStr} ${convertedVal}, ${targetTypeStr}* ${localVar}`,
        );
      }

      this.generateBlock(clause.body);
      if (!this.isTerminator(this.output[this.output.length - 1] || "")) {
        this.emit(`  br label %${endLabel}`);
      }

      // If nextTarget was "catch.other", we need to emit it
      if (i === stmt.catchClauses.length - 1 && stmt.catchOther) {
        this.emit(`${nextTarget}:`);
        this.generateBlock(stmt.catchOther);
        if (!this.isTerminator(this.output[this.output.length - 1] || "")) {
          this.emit(`  br label %${endLabel}`);
        }
      }
    }

    // Handling case where loop logic above didn't emit throw/exit fallthrough if no catchOther
    if (stmt.catchClauses.length > 0 && !stmt.catchOther) {
      // The last 'nextTarget' was endLabel. This means unhandled exception is SWALLOWED.
      // This is technically wrong but acceptable for this "try-catch" MVP if explicitly documented or requested.
      // However, let's allow it to fall through to endLabel.
    }

    this.emit(`${endLabel}:`);
  }

  private generateThrow(stmt: AST.ThrowStmt) {
    // 1. Evaluate
    const val = this.generateExpression(stmt.expression);
    if (!stmt.expression.resolvedType) {
      throw this.createError(
        "Throw expression has no resolved type",
        stmt.expression,
        "This is likely an internal compiler error - type checking should have caught this",
      );
    }
    const type = stmt.expression.resolvedType;
    const typeStr = this.resolveType(type);

    // 2. Set type ID
    const typeId = this.getTypeIdFromNode(type);
    this.emit(`  store i32 ${typeId}, i32* @exception_type`);

    // 3. Store Value
    // For structs, allocate on heap and store pointer. For primitives, store directly as i64.
    if (typeStr.startsWith("%struct.")) {
      // Calculate size of struct
      // Create sizePtrReg first so it gets a lower register number
      const sizePtrReg = this.newRegister();
      const sizeReg = this.newRegister();
      this.emit(
        `  ${sizePtrReg} = getelementptr ${typeStr}, ${typeStr}* null, i32 1`,
      );
      this.emit(`  ${sizeReg} = ptrtoint ${typeStr}* ${sizePtrReg} to i64`);

      // Allocate on heap
      const heapPtrVoid = this.newRegister();
      this.emit(`  ${heapPtrVoid} = call i8* @malloc(i64 ${sizeReg})`);

      // Cast to struct pointer
      const heapPtr = this.newRegister();
      this.emit(`  ${heapPtr} = bitcast i8* ${heapPtrVoid} to ${typeStr}*`);

      // Store struct value directly to heap (val is already a struct value)
      this.emit(`  store ${typeStr} ${val}, ${typeStr}* ${heapPtr}`);

      // Store pointer as i64 in exception_value
      const ptrAsI64 = this.newRegister();
      this.emit(`  ${ptrAsI64} = ptrtoint ${typeStr}* ${heapPtr} to i64`);
      this.emit(`  store i64 ${ptrAsI64}, i64* @exception_value`);
    } else {
      // For primitive types, cast to i64 and store directly
      const castVal = this.emitCast(val, typeStr, "i64", type, {
        kind: "BasicType",
        name: "i64",
        genericArgs: [],
        pointerDepth: 0,
        arrayDimensions: [],
        location: stmt.location,
      } as AST.BasicTypeNode);
      this.emit(`  store i64 ${castVal}, i64* @exception_value`);
    }

    // 4. Longjmp
    const framePtr = this.newRegister();
    this.emit(
      `  ${framePtr} = load %struct.ExceptionFrame*, %struct.ExceptionFrame** @exception_top`,
    );

    const isNull = this.newRegister();
    this.emit(
      `  ${isNull} = icmp eq %struct.ExceptionFrame* ${framePtr}, null`,
    );

    const abortLabel = this.newLabel("throw.abort");
    const jumpLabel = this.newLabel("throw.jump");

    this.emit(`  br i1 ${isNull}, label %${abortLabel}, label %${jumpLabel}`);

    this.emit(`${abortLabel}:`);
    this.emit(`  call void @exit(i32 1)`);
    this.emit(`  unreachable`);

    this.emit(`${jumpLabel}:`);
    const bufFieldPtr = this.newRegister();
    this.emit(
      `  ${bufFieldPtr} = getelementptr inbounds %struct.ExceptionFrame, %struct.ExceptionFrame* ${framePtr}, i32 0, i32 0`,
    );

    const bufVoidPtr = this.newRegister();
    this.emit(`  ${bufVoidPtr} = bitcast [32 x i64]* ${bufFieldPtr} to i8*`);

    this.emit(`  call void @longjmp(i8* ${bufVoidPtr}, i32 1)`);
    this.emit(`  unreachable`);
  }

  private generateBreak(stmt: AST.BreakStmt) {
    if (this.loopStack.length === 0) {
      throw this.createError(
        "Break statement outside of loop",
        stmt,
        "Break statements can only be used inside loops (for, while, do-while)",
      );
    }
    const { breakLabel } = this.loopStack[this.loopStack.length - 1]!;
    this.emit(`  br label %${breakLabel}`);
  }

  private generateContinue(stmt: AST.ContinueStmt) {
    if (this.loopStack.length === 0) {
      throw this.createError(
        "Continue statement outside of loop",
        stmt,
        "Continue statements can only be used inside loops (for, while, do-while)",
      );
    }
    const { continueLabel } = this.loopStack[this.loopStack.length - 1]!;
    this.emit(`  br label %${continueLabel}`);
  }

  private generateVariableDecl(decl: AST.VariableDecl) {
    if (typeof decl.name !== "string") {
      // Tuple destructuring: local (a, b, c) = expr;
      const targets = decl.name as
        | { name: string; type?: AST.TypeNode }[]
        | any[];

      if (!decl.initializer) {
        throw this.createError(
          "Tuple destructuring requires an initializer",
          decl,
          "Provide a value to destructure, e.g.: let (a, b) = getTuple();",
        );
      }

      // Generate the tuple value
      const tupleVal = this.generateExpression(decl.initializer);
      const tupleType = this.resolveType(decl.initializer.resolvedType!);

      // Helper to recursively extract nested tuples
      const extractTargets = (
        targets: any[],
        tupleVal: string,
        tupleType: string,
        indexPath: number[] = [],
      ) => {
        for (let i = 0; i < targets.length; i++) {
          const target = targets[i];

          if (Array.isArray(target)) {
            // Nested tuple destructuring - extract the nested tuple first
            const nestedVal = this.newRegister();

            // Extract the nested tuple from the current level (single index)
            this.emit(
              `  ${nestedVal} = extractvalue ${tupleType} ${tupleVal}, ${i}`,
            );

            // Determine the nested tuple type
            let nestedType = decl.initializer!.resolvedType!;
            for (const idx of indexPath) {
              if (nestedType.kind === "TupleType") {
                nestedType = (nestedType as AST.TupleTypeNode).types[idx]!;
              }
            }
            if (nestedType.kind === "TupleType") {
              nestedType = (nestedType as AST.TupleTypeNode).types[i]!;
            }
            const nestedTypeStr = this.resolveType(nestedType);

            // Recursively extract from the nested tuple value
            extractTargets(target, nestedVal, nestedTypeStr, [...indexPath, i]);
          } else {
            // Simple target
            this.locals.add(target.name);

            const targetType = target.type
              ? this.resolveType(target.type)
              : this.getTargetTypeFromTuple(decl.initializer!.resolvedType!, [
                  ...indexPath,
                  i,
                ]);

            const addr = this.allocateStack(target.name, targetType);

            // Extract the i-th element from the current tuple level (single index)
            const elemPtr = this.newRegister();
            this.emit(
              `  ${elemPtr} = extractvalue ${tupleType} ${tupleVal}, ${i}`,
            );

            // Store to the target variable
            this.emit(
              `  store ${targetType} ${elemPtr}, ${targetType}* ${addr}`,
            );
          }
        }
      };

      extractTargets(targets, tupleVal, tupleType);
      return;
    }

    this.locals.add(decl.name);

    if (!decl.typeAnnotation && !decl.initializer?.resolvedType) {
      // If type inference is working, resolvedType should be on the initializer or we need to infer it.
      // But VariableDecl doesn't have resolvedType on itself usually, it relies on typeAnnotation or initializer.
      // Let's assume typeAnnotation is present or we can get it from initializer.
    }

    const type = decl.resolvedType
      ? this.resolveType(decl.resolvedType)
      : decl.typeAnnotation
        ? this.resolveType(decl.typeAnnotation)
        : this.resolveType(decl.initializer!.resolvedType!);
    const addr = this.allocateStack(decl.name as string, type);

    if (decl.initializer) {
      const val = this.generateExpression(decl.initializer);
      const srcType = this.resolveType(decl.initializer.resolvedType!);
      const destType = type;
      const castVal = this.emitCast(
        val,
        srcType,
        destType,
        decl.initializer.resolvedType!,
        decl.resolvedType ||
          decl.typeAnnotation ||
          decl.initializer.resolvedType!,
      );
      this.emit(`  store ${type} ${castVal}, ${type}* ${addr}`);

      // Update null flag for struct locals
      const flagPtr = this.localNullFlags.get(decl.name as string);
      if (flagPtr) {
        let flagVal = "1"; // Default: struct is not null (valid)

        // If assigning a null literal, set flag to 0
        if (
          decl.initializer.kind === "Literal" &&
          (decl.initializer as AST.LiteralExpr).type === "null"
        ) {
          flagVal = "0"; // null means the struct is null
        }
        // If assigning from another struct local with a flag, propagate
        else if (decl.initializer.kind === "Identifier") {
          const srcId = decl.initializer as AST.IdentifierExpr;
          const srcFlag = this.localNullFlags.get(srcId.name);
          if (srcFlag) {
            const loaded = this.newRegister();
            this.emit(`  ${loaded} = load i1, i1* ${srcFlag}`);
            flagVal = loaded;
          }
        }
        // For all other cases (struct literals, function calls, etc), assume not null (1)
        // Zero values in fields are valid data, not null

        this.emit(`  store i1 ${flagVal}, i1* ${flagPtr}`);
      }

      // Track pointer-to-local in variable declarations: e.g., local y: *X = &x;
      if (
        decl.initializer.kind === "Unary" &&
        (decl.initializer as AST.UnaryExpr).operator.type ===
          TokenType.Ampersand
      ) {
        const unaryExpr = decl.initializer as AST.UnaryExpr;
        if (unaryExpr.operand.kind === "Identifier") {
          const sourceLocal = (unaryExpr.operand as AST.IdentifierExpr).name;
          this.pointerToLocal.set(decl.name as string, sourceLocal);
        }
      }
    }
  }

  private generateReturn(stmt: AST.ReturnStmt) {
    if (this.onReturn) this.onReturn();
    if (stmt.value) {
      const rawVal = this.generateExpression(stmt.value);
      const destTypeNode = this.currentFunctionReturnType!;
      const destType = this.resolveType(destTypeNode);
      const srcTypeNode = stmt.value.resolvedType!;
      const srcType = this.resolveType(srcTypeNode);

      let castVal = this.emitCast(
        rawVal,
        srcType,
        destType,
        srcTypeNode,
        destTypeNode,
      );

      // If returning a struct value that has a null flag, update __null_bit__ before returning
      if (destType.startsWith("%struct.") && !destType.endsWith("*")) {
        if (stmt.value.kind === "Identifier") {
          const varName = (stmt.value as AST.IdentifierExpr).name;
          const flagPtr = this.localNullFlags.get(varName);
          if (flagPtr) {
            // Load the flag and update __null_bit__ in the struct
            const flagVal = this.newRegister();
            this.emit(`  ${flagVal} = load i1, i1* ${flagPtr}`);

            // Get __null_bit__ index
            const structName = (destTypeNode as AST.BasicTypeNode)?.name;
            const layout = this.structLayouts.get(structName);
            const nullBitIndex = layout ? layout.get("__null_bit__") : -1;

            if (nullBitIndex !== undefined && nullBitIndex >= 0) {
              // Insert the flag value into the struct's __null_bit__ field
              const newStructVal = this.newRegister();
              this.emit(
                `  ${newStructVal} = insertvalue ${destType} ${castVal}, i1 ${flagVal}, ${nullBitIndex}`,
              );
              castVal = newStructVal;
            }
          }
        }
      }

      this.emit(`  ret ${destType} ${castVal}`);
    } else {
      // For void returns, check if this is main with modified return type
      if (this.isMainWithVoidReturn) {
        this.emit("  ret i32 0");
      } else {
        this.emit("  ret void");
      }
    }
  }

  private generateIf(stmt: AST.IfStmt) {
    const cond = this.generateExpression(stmt.condition);
    const thenLabel = this.newLabel("then");
    const elseLabel = this.newLabel("else");
    const mergeLabel = this.newLabel("merge");

    const hasElse = !!stmt.elseBranch;
    const targetElse = hasElse ? elseLabel : mergeLabel;

    this.emit(`  br i1 ${cond}, label %${thenLabel}, label %${targetElse}`);

    this.emit(`${thenLabel}:`);
    this.generateBlock(stmt.thenBranch);
    if (!this.isTerminator(this.output[this.output.length - 1] || "")) {
      this.emit(`  br label %${mergeLabel}`);
    }

    if (hasElse) {
      this.emit(`${elseLabel}:`);
      if (stmt.elseBranch!.kind === "Block") {
        this.generateBlock(stmt.elseBranch as AST.BlockStmt);
      } else if (stmt.elseBranch!.kind === "If") {
        this.generateIf(stmt.elseBranch as AST.IfStmt);
      } else {
        // Single statement else? AST says elseBranch is Statement.
        this.generateStatement(stmt.elseBranch!);
      }

      if (!this.isTerminator(this.output[this.output.length - 1] || "")) {
        this.emit(`  br label %${mergeLabel}`);
      }
    }

    this.emit(`${mergeLabel}:`);
  }

  private generateLoop(stmt: AST.LoopStmt) {
    const condLabel = this.newLabel("cond");
    const bodyLabel = this.newLabel("body");
    const endLabel = this.newLabel("end");

    this.loopStack.push({ continueLabel: condLabel, breakLabel: endLabel });

    this.emit(`  br label %${condLabel}`);
    this.emit(`${condLabel}:`);

    if (stmt.condition) {
      const cond = this.generateExpression(stmt.condition);
      this.emit(`  br i1 ${cond}, label %${bodyLabel}, label %${endLabel}`);
    } else {
      this.emit(`  br label %${bodyLabel}`);
    }

    this.emit(`${bodyLabel}:`);
    this.generateBlock(stmt.body);
    if (!this.isTerminator(this.output[this.output.length - 1] || "")) {
      this.emit(`  br label %${condLabel}`);
    }

    this.loopStack.pop();
    this.emit(`${endLabel}:`);
  }

  private generateExpression(expr: AST.Expression): string {
    switch (expr.kind) {
      case "Literal":
        return this.generateLiteral(expr as AST.LiteralExpr);
      case "Identifier":
        return this.generateIdentifier(expr as AST.IdentifierExpr);
      case "Binary":
        const binExpr = expr as AST.BinaryExpr;
        if (binExpr.operator.type === TokenType.AndAnd) {
          return this.generateLogicalAnd(binExpr);
        } else if (binExpr.operator.type === TokenType.OrOr) {
          return this.generateLogicalOr(binExpr);
        }
        return this.generateBinary(binExpr);
      case "Call":
        return this.generateCall(expr as AST.CallExpr);
      case "Assignment":
        return this.generateAssignment(expr as AST.AssignmentExpr);
      case "Member":
        return this.generateMember(expr as AST.MemberExpr);
      case "Index":
        return this.generateIndex(expr as AST.IndexExpr);
      case "Unary":
        return this.generateUnary(expr as AST.UnaryExpr);
      case "Cast":
        return this.generateCast(expr as AST.CastExpr);
      case "ArrayLiteral":
        return this.generateArrayLiteral(expr as AST.ArrayLiteralExpr);
      case "StructLiteral":
        return this.generateStructLiteral(expr as AST.StructLiteralExpr);
      case "TupleLiteral":
        return this.generateTupleLiteral(expr as AST.TupleLiteralExpr);
      case "EnumStructVariant":
        return this.generateEnumStructVariant(
          expr as AST.EnumStructVariantExpr,
        );
      case "Sizeof":
        return this.generateSizeof(expr as AST.SizeofExpr);
      case "Ternary":
        return this.generateTernary(expr as AST.TernaryExpr);
      case "Match":
        return this.generateMatchExpr(expr as AST.MatchExpr);
      case "TypeMatch":
        return this.generateTypeMatch(expr as AST.TypeMatchExpr);
      default:
        console.warn(`Unhandled expression kind: ${expr.kind}`);
        return "0"; // Placeholder
    }
  }

  private generateMatchExpr(expr: AST.MatchExpr): string {
    // Generate the value to match on
    const matchValue = this.generateExpression(expr.value);
    const matchType = expr.value.resolvedType as AST.BasicTypeNode;

    if (!matchType || matchType.kind !== "BasicType") {
      throw this.createError(
        "Match expression value must have a basic type",
        expr.value,
      );
    }

    // Get enum information - handle generic instantiation
    let enumName = matchType.name;

    // If this is a generic enum, instantiate it
    if (matchType.genericArgs && matchType.genericArgs.length > 0) {
      enumName = this.instantiateGenericEnum(
        matchType.name,
        matchType.genericArgs,
      );
    }

    const variantInfo = this.enumVariants.get(enumName);

    if (!variantInfo) {
      throw this.createError(
        `Cannot match on non-enum type '${matchType.name}'`,
        expr.value,
      );
    }

    // Allocate space for match value and extract discriminant
    const enumType = `%enum.${enumName}`;
    const matchPtr = this.newRegister();
    this.emit(`  ${matchPtr} = alloca ${enumType}`);
    this.emit(`  store ${enumType} ${matchValue}, ${enumType}* ${matchPtr}`);

    const tagPtr = this.newRegister();
    this.emit(
      `  ${tagPtr} = getelementptr inbounds ${enumType}, ${enumType}* ${matchPtr}, i32 0, i32 0`,
    );
    const tag = this.newRegister();
    this.emit(`  ${tag} = load i32, i32* ${tagPtr}`);

    // Create labels for each arm and merge point
    const armLabels: string[] = [];
    const mergeLabel = this.newLabel("match_merge");
    const defaultLabel = this.newLabel("match_default");

    for (let i = 0; i < expr.arms.length; i++) {
      armLabels.push(this.newLabel(`match_arm${i}`));
    }

    // Build a map from variant index to first arm index for that variant
    // This avoids duplicate switch cases when multiple arms match the same variant (with guards)
    const variantToFirstArm = new Map<number, number>();

    // Generate switch statement
    const cases: string[] = [];
    for (let i = 0; i < expr.arms.length; i++) {
      const arm = expr.arms[i]!;
      const pattern = arm.pattern;

      // Handle enum patterns
      if (
        pattern.kind === "PatternEnum" ||
        pattern.kind === "PatternEnumTuple" ||
        pattern.kind === "PatternEnumStruct"
      ) {
        const enumPattern = pattern as
          | AST.PatternEnum
          | AST.PatternEnumTuple
          | AST.PatternEnumStruct;
        const variant = variantInfo.get(enumPattern.variantName);
        if (variant) {
          // Only add switch case for the FIRST arm with this variant
          if (!variantToFirstArm.has(variant.index)) {
            variantToFirstArm.set(variant.index, i);
            cases.push(`i32 ${variant.index}, label %${armLabels[i]}`);
          }
        }
      } else if (pattern.kind === "PatternWildcard") {
        // Wildcard handled as default case
      }
    }

    // Emit switch
    this.emit(
      `  switch i32 ${tag}, label %${defaultLabel} [${cases.join("\n    ")}]`,
    );

    // Generate code for each arm
    const armResults: Array<{ value: string; label: string; type: string }> =
      [];
    const resultType = this.resolveType(expr.resolvedType!);

    for (let i = 0; i < expr.arms.length; i++) {
      const arm = expr.arms[i]!;
      this.emit(`${armLabels[i]}:`);

      // Extract pattern bindings if this is a tuple or struct pattern
      if (arm.pattern.kind === "PatternEnumTuple") {
        this.generatePatternTupleBindings(
          arm.pattern as AST.PatternEnumTuple,
          matchPtr,
          enumType,
          variantInfo,
        );
      } else if (arm.pattern.kind === "PatternEnumStruct") {
        this.generatePatternStructBindings(
          arm.pattern as AST.PatternEnumStruct,
          matchPtr,
          enumType,
          variantInfo,
        );
      }

      // Check guard condition if present
      if (arm.guard) {
        const guardValue = this.generateExpression(arm.guard);
        const guardPassLabel = this.newLabel(`guard_pass${i}`);

        // Find next arm: try next arm with same variant first, then default
        let nextLabel = defaultLabel;
        if (i + 1 < expr.arms.length) {
          // Check if next arm is for the same variant
          const currentPattern = arm.pattern;
          const nextPattern = expr.arms[i + 1]!.pattern;

          if (
            (currentPattern.kind === "PatternEnum" ||
              currentPattern.kind === "PatternEnumTuple" ||
              currentPattern.kind === "PatternEnumStruct") &&
            (nextPattern.kind === "PatternEnum" ||
              nextPattern.kind === "PatternEnumTuple" ||
              nextPattern.kind === "PatternEnumStruct")
          ) {
            const currentVariant = (currentPattern as any).variantName;
            const nextVariant = (nextPattern as any).variantName;

            // If same variant, jump to next arm; otherwise jump to default
            if (currentVariant === nextVariant) {
              nextLabel = armLabels[i + 1]!;
            }
          }
        }

        this.emit(
          `  br i1 ${guardValue}, label %${guardPassLabel}, label %${nextLabel}`,
        );
        this.emit(`${guardPassLabel}:`);
      }

      // Generate arm body
      const armValue = this.generateMatchArmBody(arm.body);
      const currentLabel = this.getCurrentLabel();
      armResults.push({
        value: armValue,
        label: currentLabel,
        type: resultType,
      });

      this.emit(`  br label %${mergeLabel}`);
    }

    // Default case (should not be reached if exhaustive, but needed for LLVM)
    this.emit(`${defaultLabel}:`);
    // Generate unreachable or a default value based on result type
    if (resultType.includes("*") || resultType.includes("i8*")) {
      // For pointer types, use null
      this.emit(`  br label %${mergeLabel}`);
      armResults.push({ value: "null", label: defaultLabel, type: resultType });
    } else if (resultType === "void") {
      this.emit(`  br label %${mergeLabel}`);
    } else {
      // For other types, use 0
      this.emit(`  br label %${mergeLabel}`);
      armResults.push({ value: "0", label: defaultLabel, type: resultType });
    }

    // Merge point with phi node
    this.emit(`${mergeLabel}:`);
    const result = this.newRegister();
    const phiEntries = armResults
      .map((r) => `[ ${r.value}, %${r.label} ]`)
      .join(", ");
    this.emit(`  ${result} = phi ${resultType} ${phiEntries}`);

    return result;
  }

  private generateMatchArmBody(body: AST.Expression | AST.BlockStmt): string {
    if (body.kind === "Block") {
      // Generate block and return the result
      const blockStmt = body as AST.BlockStmt;
      this.generateBlock(blockStmt);
      // For now, blocks in match arms must end with a return
      // TODO: Handle implicit return from last expression
      return "0";
    } else {
      // Expression - generate and return
      return this.generateExpression(body as AST.Expression);
    }
  }

  private generateTypeMatch(expr: AST.TypeMatchExpr): string {
    // Generate code for match<Type>(value)
    // This checks:
    // 1. If enum value is of a specific variant: match<Option.Some>(opt)
    // 2. If value matches a specific type: match<int>(arg) in generic context

    // The value should be an expression
    if (!("kind" in expr.value) || (expr.value as any).kind === "BasicType") {
      throw this.createError(
        "TypeMatch value must be an expression",
        expr as any,
      );
    }

    const valueExpr = expr.value as AST.Expression;
    const matchValue = this.generateExpression(valueExpr);
    const valueType = valueExpr.resolvedType;

    if (!valueType) {
      throw this.createError("TypeMatch value has no resolved type", valueExpr);
    }

    const targetType = expr.targetType as AST.BasicTypeNode;
    const fullTypeName = targetType.name;

    // Check if this is an enum variant pattern (contains a dot)
    if (fullTypeName.includes(".")) {
      return this.generateEnumVariantTypeMatch(
        matchValue,
        valueType as AST.BasicTypeNode,
        fullTypeName,
        expr,
      );
    } else {
      // Regular type checking for non-enum types
      return this.generateRegularTypeMatch(
        matchValue,
        valueType,
        targetType,
        expr,
      );
    }
  }

  private generateEnumVariantTypeMatch(
    matchValue: string,
    valueType: AST.BasicTypeNode,
    fullTypeName: string,
    expr: AST.TypeMatchExpr,
  ): string {
    // Split enum name and variant name
    const parts = fullTypeName.split(".");
    const enumName = parts[0]!;
    const variantName = parts.slice(1).join("."); // Handle nested dots if any

    // Get enum information - handle generic instantiation
    let resolvedEnumName = enumName;
    if (valueType.genericArgs && valueType.genericArgs.length > 0) {
      resolvedEnumName = this.instantiateGenericEnum(
        enumName,
        valueType.genericArgs,
      );
    }

    const variantInfo = this.enumVariants.get(resolvedEnumName);
    if (!variantInfo) {
      throw this.createError(`Cannot find enum '${enumName}'`, expr as any);
    }

    const variant = variantInfo.get(variantName);
    if (!variant) {
      throw this.createError(
        `Cannot find variant '${variantName}' in enum '${enumName}'`,
        expr as any,
      );
    }

    // Allocate space for the enum value and extract discriminant
    const enumType = `%enum.${resolvedEnumName}`;
    const matchPtr = this.newRegister();
    this.emit(`  ${matchPtr} = alloca ${enumType}`);
    this.emit(`  store ${enumType} ${matchValue}, ${enumType}* ${matchPtr}`);

    const tagPtr = this.newRegister();
    this.emit(
      `  ${tagPtr} = getelementptr inbounds ${enumType}, ${enumType}* ${matchPtr}, i32 0, i32 0`,
    );
    const tag = this.newRegister();
    this.emit(`  ${tag} = load i32, i32* ${tagPtr}`);

    // Compare tag with variant index
    const result = this.newRegister();
    this.emit(`  ${result} = icmp eq i32 ${tag}, ${variant.index}`);

    return result;
  }

  private generateRegularTypeMatch(
    matchValue: string,
    valueType: AST.TypeNode,
    targetType: AST.BasicTypeNode,
    expr: AST.TypeMatchExpr,
  ): string {
    // For regular type matching, compare the resolved LLVM types
    // Since generics are monomorphized, we know the concrete types at compile time.

    const valueTypeStr = this.resolveType(valueType);
    const targetTypeStr = this.resolveType(targetType);

    // Exact match
    if (valueTypeStr === targetTypeStr) {
      const result = this.newRegister();
      this.emit(`  ${result} = icmp eq i1 1, 1`);
      return result;
    }

    // Inheritance checking
    if (valueType.kind === "BasicType" && targetType.kind === "BasicType") {
      const valueBasic = valueType as AST.BasicTypeNode;
      const targetBasic = targetType as AST.BasicTypeNode;

      // Only check inheritance if pointer depth matches
      if (valueBasic.pointerDepth === targetBasic.pointerDepth) {
        if (this.checkInheritance(valueBasic.name, targetBasic.name)) {
          const result = this.newRegister();
          this.emit(`  ${result} = icmp eq i1 1, 1`);
          return result;
        }
      }
    }

    // Otherwise, types do not match
    const result = this.newRegister();
    this.emit(`  ${result} = icmp eq i1 0, 1`);
    return result;
  }

  private checkInheritance(childName: string, parentName: string): boolean {
    if (childName === parentName) return true;

    const structDecl = this.structMap.get(childName);
    if (!structDecl) return false;

    if (structDecl.inheritanceList) {
      for (const parent of structDecl.inheritanceList) {
        if (parent.kind === "BasicType") {
          const parentBasic = parent as AST.BasicTypeNode;
          // Check direct parent
          if (parentBasic.name === parentName) return true;
          // Check recursive
          if (this.checkInheritance(parentBasic.name, parentName)) return true;
        }
      }
    }
    return false;
  }

  private isGenericTypeParameter(name: string): boolean {
    // Check if this is a generic type parameter (usually single uppercase letter or short name)
    // This is a heuristic - better would be to track in symbol table
    return name.length <= 2 && name === name.toUpperCase();
  }

  private isPrimitiveType(name: string): boolean {
    const primitives = [
      "int",
      "i8",
      "i16",
      "i32",
      "i64",
      "u8",
      "u16",
      "u32",
      "u64",
      "float",
      "double",
      "bool",
      "char",
      "void",
      "string",
    ];
    return primitives.includes(name);
  }

  private getASTTypeSize(type: AST.TypeNode): number {
    const typeStr = this.resolveType(type);

    // Map LLVM types to sizes
    if (typeStr === "i1") return 1;
    if (typeStr === "i8") return 1;
    if (typeStr === "i16") return 2;
    if (typeStr === "i32") return 4;
    if (typeStr === "i64") return 8;
    if (typeStr === "float") return 4;
    if (typeStr === "double") return 8;
    if (typeStr.includes("*")) return 8; // Pointers are 8 bytes

    // For structs and other types, return a default
    return 0;
  }

  private generatePatternTupleBindings(
    pattern: AST.PatternEnumTuple,
    matchPtr: string,
    enumType: string,
    variantInfo: Map<string, { index: number; dataType?: AST.EnumVariantData }>,
  ): void {
    const variant = variantInfo.get(pattern.variantName);
    if (
      !variant ||
      !variant.dataType ||
      variant.dataType.kind !== "EnumVariantTuple"
    ) {
      return; // No data to extract
    }

    // Get pointer to data field (index 1) - this is an array of bytes
    const dataPtr = this.newRegister();
    this.emit(
      `  ${dataPtr} = getelementptr inbounds ${enumType}, ${enumType}* ${matchPtr}, i32 0, i32 1`,
    );

    // Get enum name from type (strip "%enum." prefix)
    const enumName = enumType.substring(6);
    const dataArraySize = this.enumDataSizes.get(enumName) || 64;

    // Cast to i8* for easier manipulation
    const bytePtr = this.newRegister();
    this.emit(
      `  ${bytePtr} = bitcast [${dataArraySize} x i8]* ${dataPtr} to i8*`,
    );

    // For each binding, extract the value from the data array with proper byte offsets
    let byteOffset = 0;
    for (let i = 0; i < pattern.bindings.length; i++) {
      const bindingName = pattern.bindings[i]!;
      const bindingType = variant.dataType.types[i]!;
      const llvmType = this.resolveType(bindingType);
      const typeSize = this.getTypeSize(llvmType);

      // Align the offset based on type size
      const alignment =
        typeSize >= 8 ? 8 : typeSize >= 4 ? 4 : typeSize >= 2 ? 2 : 1;
      if (byteOffset % alignment !== 0) {
        byteOffset = Math.ceil(byteOffset / alignment) * alignment;
      }

      // Skip wildcard bindings (but still account for offset)
      if (bindingName === "_") {
        byteOffset += typeSize;
        continue;
      }

      // Get pointer at the correct byte offset
      let elementPtr: string;
      if (byteOffset === 0) {
        elementPtr = this.newRegister();
        this.emit(`  ${elementPtr} = bitcast i8* ${bytePtr} to ${llvmType}*`);
      } else {
        const offsetPtr = this.newRegister();
        this.emit(
          `  ${offsetPtr} = getelementptr i8, i8* ${bytePtr}, i32 ${byteOffset}`,
        );
        elementPtr = this.newRegister();
        this.emit(`  ${elementPtr} = bitcast i8* ${offsetPtr} to ${llvmType}*`);
      }

      // Load the value
      const value = this.newRegister();
      this.emit(`  ${value} = load ${llvmType}, ${llvmType}* ${elementPtr}`);

      // Allocate stack space and store the value
      const ptr = `%pattern_${bindingName}_${this.stackAllocCount++}`;
      this.emit(`  ${ptr} = alloca ${llvmType}`);
      this.emit(`  store ${llvmType} ${value}, ${llvmType}* ${ptr}`);

      // Register the binding so it can be used in the arm body
      this.locals.add(bindingName);
      this.localPointers.set(bindingName, ptr);

      byteOffset += typeSize;
    }
  }

  private generatePatternStructBindings(
    pattern: AST.PatternEnumStruct,
    matchPtr: string,
    enumType: string,
    variantInfo: Map<string, { index: number; dataType?: AST.EnumVariantData }>,
  ): void {
    const variant = variantInfo.get(pattern.variantName);
    if (
      !variant ||
      !variant.dataType ||
      variant.dataType.kind !== "EnumVariantStruct"
    ) {
      return; // No data to extract
    }

    // Get pointer to data field (index 1)
    const dataPtr = this.newRegister();
    this.emit(
      `  ${dataPtr} = getelementptr inbounds ${enumType}, ${enumType}* ${matchPtr}, i32 0, i32 1`,
    );

    // For each field binding, extract the value
    for (const field of pattern.fields) {
      const bindingName = field.binding;

      // Skip wildcard bindings
      if (bindingName === "_") {
        continue;
      }

      // Find the field in the variant
      const fieldIndex = variant.dataType.fields.findIndex(
        (f) => f.name === field.fieldName,
      );
      if (fieldIndex === -1) {
        continue;
      }

      const fieldType = variant.dataType.fields[fieldIndex]!.type;
      const llvmType = this.resolveType(fieldType);

      // Cast the data pointer to i8* to work with byte offsets
      const bytePtr = this.newRegister();
      this.emit(
        `  ${bytePtr} = bitcast [${
          this.structLayouts.get(enumType.substring(6))?.get("__data__") || 0
        } x i8]* ${dataPtr} to i8*`,
      );

      // Cast to the field type pointer
      const fieldPtr = this.newRegister();
      this.emit(`  ${fieldPtr} = bitcast i8* ${bytePtr} to ${llvmType}*`);

      // If this is not the first field, offset the pointer
      let targetPtr = fieldPtr;
      if (fieldIndex > 0) {
        targetPtr = this.newRegister();
        this.emit(
          `  ${targetPtr} = getelementptr ${llvmType}, ${llvmType}* ${fieldPtr}, i32 ${fieldIndex}`,
        );
      }

      // Load the value
      const value = this.newRegister();
      this.emit(`  ${value} = load ${llvmType}, ${llvmType}* ${targetPtr}`);

      // Allocate stack space and store the value
      const ptr = `%pattern_${bindingName}_${this.stackAllocCount++}`;
      this.emit(`  ${ptr} = alloca ${llvmType}`);
      this.emit(`  store ${llvmType} ${value}, ${llvmType}* ${ptr}`);

      // Register the binding so it can be used in the arm body
      this.locals.add(bindingName);
      this.localPointers.set(bindingName, ptr);
    }
  }

  private generateTernary(expr: AST.TernaryExpr): string {
    const cond = this.generateExpression(expr.condition);
    const thenLabel = this.newLabel("then");
    const elseLabel = this.newLabel("else");
    const mergeLabel = this.newLabel("merge");

    this.emit(`  br i1 ${cond}, label %${thenLabel}, label %${elseLabel}`);

    this.emit(`${thenLabel}:`);
    const thenVal = this.generateExpression(expr.trueExpr);
    const thenEndLabel = this.getCurrentLabel();
    this.emit(`  br label %${mergeLabel}`);

    this.emit(`${elseLabel}:`);
    const elseVal = this.generateExpression(expr.falseExpr);
    const elseEndLabel = this.getCurrentLabel();
    this.emit(`  br label %${mergeLabel}`);

    this.emit(`${mergeLabel}:`);
    const type = this.resolveType(expr.resolvedType!);
    const phi = this.newRegister();
    this.emit(
      `  ${phi} = phi ${type} [ ${thenVal}, %${thenEndLabel} ], [ ${elseVal}, %${elseEndLabel} ]`,
    );
    return phi;
  }

  private getCurrentLabel(): string {
    // Find the last emitted label by scanning backwards
    for (let i = this.output.length - 1; i >= 0; i--) {
      const line = this.output[i]!.trim();
      if (line.endsWith(":") && !line.includes(" ")) {
        return line.slice(0, -1); // Remove the ':'
      }
    }
    return "entry"; // fallback
  }

  private getTargetTypeFromTuple(
    tupleType: AST.TypeNode,
    indexPath: number[],
  ): string {
    let currentType = tupleType;
    for (const idx of indexPath) {
      if (currentType.kind === "TupleType") {
        currentType = (currentType as AST.TupleTypeNode).types[idx]!;
      } else {
        return "i32"; // fallback
      }
    }
    return this.resolveType(currentType);
  }

  private generateLiteral(expr: AST.LiteralExpr): string {
    if (expr.type === "number") {
      // Check if this is a floating point type
      if (expr.resolvedType && expr.resolvedType.kind === "BasicType") {
        const typeName = (expr.resolvedType as AST.BasicTypeNode).name;
        if (typeName === "float" || typeName === "double") {
          // Ensure float literals have decimal point
          const str = expr.value.toString();
          return str.includes(".") ? str : `${str}.0`;
        }
      }

      // Use raw value for integers to preserve precision
      if (expr.raw) {
        try {
          const cleaned = expr.raw.replace(/_/g, "");
          // Only use BigInt if it doesn't look like a float
          if (!cleaned.includes(".")) {
            return BigInt(cleaned).toString();
          }
        } catch (e) {
          // Fallback to value.toString()
        }
      }

      return expr.value.toString();
    } else if (expr.type === "char") {
      return expr.value.toString().charCodeAt(0);
    } else if (expr.type === "bool") {
      return expr.value ? "1" : "0";
    } else if (expr.type === "nullptr" || expr.type === "null") {
      return "null";
    } else if (expr.type === "string") {
      const content = expr.value;
      if (!this.stringLiterals.has(content)) {
        const varName = `@.str.${this.stringLiterals.size}`;
        this.stringLiterals.set(content, varName);
      }
      const varName = this.stringLiterals.get(content)!;
      const len = content.length + 1;
      // Get pointer to first element
      return `getelementptr inbounds ([${len} x i8], [${len} x i8]* ${varName}, i64 0, i64 0)`; // This returns i8*
    }
    return "0";
  }

  private generateIdentifier(expr: AST.IdentifierExpr): string {
    const name = expr.name;
    if (!expr.resolvedType) {
      throw new Error(`Identifier '${name}' has no resolved type`);
    }

    // Special case: function identifiers (not local variables) evaluate to their address directly
    if (expr.resolvedType.kind === "FunctionType" && !this.locals.has(name)) {
      if (
        expr.resolvedDeclaration &&
        expr.resolvedDeclaration.kind === "FunctionDecl"
      ) {
        const decl = expr.resolvedDeclaration as AST.FunctionDecl;
        // If it's a generic function, we might need to handle it, but usually identifiers refer to specific instances or non-generics
        // If it has a resolvedType that is a FunctionType, we can use that for mangling
        return `@${this.getMangledName(decl.name, expr.resolvedType as AST.FunctionTypeNode)}`;
      }
      return `@${name}`;
    }

    const type = this.resolveType(expr.resolvedType!);
    const addr = this.generateAddress(expr);
    const reg = this.newRegister();
    this.emit(`  ${reg} = load ${type}, ${type}* ${addr}`);
    return reg;
  }

  private generateBinary(expr: AST.BinaryExpr): string {
    // Check for operator overload
    if (expr.operatorOverload) {
      const overload = expr.operatorOverload;
      const method = overload.methodDeclaration;
      const leftRaw = this.generateExpression(expr.left);
      const rightRaw = this.generateExpression(expr.right);

      const targetType = overload.targetType as AST.BasicTypeNode;

      // Handle generic struct method calls
      let mangledName: string;
      if (targetType.genericArgs && targetType.genericArgs.length > 0) {
        // Generic struct - need monomorphized method name
        const structDecl = this.structMap.get(targetType.name);
        if (structDecl && structDecl.genericParams.length > 0) {
          // Build context map for generic substitution
          const contextMap = new Map<string, AST.TypeNode>();
          for (let i = 0; i < structDecl.genericParams.length; i++) {
            contextMap.set(
              structDecl.genericParams[i]!.name,
              targetType.genericArgs[i]!,
            );
          }

          // Build monomorphized struct name using mangleType (avoids recursion)
          const argNames = targetType.genericArgs
            .map((arg) => this.mangleType(arg))
            .join("_");
          const structName = `${targetType.name}_${argNames}`;

          // Build method name
          const methodType = method.resolvedType as AST.FunctionTypeNode;
          const fullMethodName = `${structName}_${method.name}`;

          // Get mangled name with substituted types
          const substitutedMethodType = this.substituteType(
            methodType,
            contextMap,
          ) as AST.FunctionTypeNode;

          mangledName = this.getMangledName(
            fullMethodName,
            substitutedMethodType,
          );
        } else {
          // Fallback: non-generic or already concrete
          const structName = targetType.name;
          const methodType = method.resolvedType as AST.FunctionTypeNode;
          const fullMethodName = `${structName}_${method.name}`;
          mangledName = this.getMangledName(fullMethodName, methodType);
        }
      } else {
        // Non-generic struct
        const structName = targetType.name;
        const methodType = method.resolvedType as AST.FunctionTypeNode;
        const fullMethodName = `${structName}_${method.name}`;
        mangledName = this.getMangledName(fullMethodName, methodType);
      }

      // Prepare arguments: this (left) + right
      const leftType = this.resolveType(expr.left.resolvedType!);
      const rightType = this.resolveType(expr.right.resolvedType!);

      // For operator overloads on pointers (like &arr << value), pass the pointer value directly
      // The left expression type should match the method's first parameter type
      let thisArg: string;
      if (leftType.endsWith("*")) {
        // Left is a pointer - pass it directly as the 'this' parameter
        thisArg = `${leftType} ${leftRaw}`;
      } else {
        // Left is a value - need to get its address
        let thisPtr: string;
        try {
          thisPtr = this.generateAddress(expr.left);
        } catch {
          // If we can't get address, spill to stack
          const spillAddr = this.allocateStack(
            `op_spill_${this.labelCount++}`,
            leftType,
          );
          this.emit(
            `  store ${leftType} ${leftRaw}, ${leftType}* ${spillAddr}`,
          );
          thisPtr = spillAddr;
        }
        thisArg = `${leftType}* ${thisPtr}`;
      }

      // Call the operator method
      // Use the expression's resolved type instead of the method's return type
      // because the expression type has generic parameters already substituted by TypeChecker
      const returnType = this.resolveType(expr.resolvedType!);
      const resultReg = this.newRegister();
      this.emit(
        `  ${resultReg} = call ${returnType} @${mangledName}(${thisArg}, ${rightType} ${rightRaw})`,
      );
      return resultReg;
    }

    const leftRaw = this.generateExpression(expr.left);
    const rightRaw = this.generateExpression(expr.right);
    const leftType = this.resolveType(expr.left.resolvedType!);
    const rightType = this.resolveType(expr.right.resolvedType!);

    // Special handling: struct/object value compared to null literal
    const isEqOp =
      expr.operator.type === TokenType.EqualEqual ||
      expr.operator.type === TokenType.BangEqual;
    const isNullLiteral = (e: AST.Expression) =>
      e.kind === "Literal" && (e as AST.LiteralExpr).type === "null";
    const isStructValue = (tNode: AST.TypeNode | undefined) => {
      if (!tNode) return false;
      if (tNode.kind !== "BasicType") return false;
      const b = tNode as AST.BasicTypeNode;
      if (b.pointerDepth > 0) return false;
      return this.structMap.has(b.name);
    };

    if (isEqOp) {
      // left struct vs null
      if (isStructValue(expr.left.resolvedType) && isNullLiteral(expr.right)) {
        const llvmT = leftType;
        // Get address of left
        let addr: string | undefined;
        try {
          addr = this.generateAddress(expr.left);
        } catch {
          const spill = this.allocateStack(
            `cmp_spill_${this.labelCount++}`,
            llvmT,
          );
          this.emit(`  store ${llvmT} ${leftRaw}, ${llvmT}* ${spill}`);
          addr = spill;
        }

        // Extract __null_bit__ field (last field in struct)
        const loaded = this.newRegister();
        this.emit(`  ${loaded} = load ${llvmT}, ${llvmT}* ${addr}`);
        const nullBitTypeName = (expr.left.resolvedType as AST.BasicTypeNode)
          .name;
        const layout = this.structLayouts.get(nullBitTypeName);
        const nullBitIndex = layout ? layout.get("__null_bit__") : -1;

        let res: string;
        if (nullBitIndex !== undefined && nullBitIndex >= 0) {
          // Extract the __null_bit__ field and check if it's 0
          const extracted = this.newRegister();
          this.emit(
            `  ${extracted} = extractvalue ${llvmT} ${loaded}, ${nullBitIndex}`,
          );
          res = this.newRegister();
          // If __null_bit__ is 0, the struct is null
          this.emit(`  ${res} = xor i1 ${extracted}, 1`);
        } else {
          // Fallback: assume not null (no __null_bit__ field)
          res = "0";
        }

        if (expr.operator.type === TokenType.EqualEqual) return res;
        const inv = this.newRegister();
        this.emit(`  ${inv} = xor i1 ${res}, true`);
        return inv;
      }
      // right struct vs null
      if (isStructValue(expr.right.resolvedType) && isNullLiteral(expr.left)) {
        const llvmT = rightType;
        let addr: string | undefined;
        try {
          addr = this.generateAddress(expr.right);
        } catch {
          const spill = this.allocateStack(
            `cmp_spill_${this.labelCount++}`,
            llvmT,
          );
          this.emit(`  store ${llvmT} ${rightRaw}, ${llvmT}* ${spill}`);
          addr = spill;
        }

        // Extract __null_bit__ field (last field in struct)
        const loaded = this.newRegister();
        this.emit(`  ${loaded} = load ${llvmT}, ${llvmT}* ${addr}`);
        const nullBitTypeName = (expr.right.resolvedType as AST.BasicTypeNode)
          .name;
        const layout = this.structLayouts.get(nullBitTypeName);
        const nullBitIndex = layout ? layout.get("__null_bit__") : -1;

        let res: string;
        if (nullBitIndex !== undefined && nullBitIndex >= 0) {
          // Extract the __null_bit__ field and check if it's 0
          const extracted = this.newRegister();
          this.emit(
            `  ${extracted} = extractvalue ${llvmT} ${loaded}, ${nullBitIndex}`,
          );
          res = this.newRegister();
          // If __null_bit__ is 0, the struct is null
          this.emit(`  ${res} = xor i1 ${extracted}, 1`);
        } else {
          // Fallback: assume not null (no __null_bit__ field)
          res = "0";
        }

        if (expr.operator.type === TokenType.EqualEqual) return res;
        const inv = this.newRegister();
        this.emit(`  ${inv} = xor i1 ${res}, true`);
        return inv;
      }

      // Enum comparison (== or !=)
      const isEnumType = (llvmType: string) => llvmType.startsWith("%enum.");
      if (isEnumType(leftType) && isEnumType(rightType)) {
        // Both are enum types - compare tags and data
        const enumTypeName = leftType; // Both should be the same type
        // Extract just the enum name (without "%enum." prefix)
        const enumName = enumTypeName.substring(6);

        // Load both enum values (they might already be values, not pointers)
        let leftVal = leftRaw;
        let rightVal = rightRaw;

        // Extract tag fields (index 0)
        const leftTag = this.newRegister();
        this.emit(`  ${leftTag} = extractvalue ${enumTypeName} ${leftVal}, 0`);
        const rightTag = this.newRegister();
        this.emit(
          `  ${rightTag} = extractvalue ${enumTypeName} ${rightVal}, 0`,
        );

        // Compare tags
        const tagsEqual = this.newRegister();
        this.emit(`  ${tagsEqual} = icmp eq i32 ${leftTag}, ${rightTag}`);

        // Check if enum has data field by looking up the stored data size
        const dataSize = this.enumDataSizes.get(enumName) || 0;

        if (dataSize > 0) {
          // Need to compare data fields as well when tags are equal
          // First, spill both enums to stack to get their addresses
          const leftPtr = this.allocateStack(
            `enum_cmp_left_${this.labelCount}`,
            enumTypeName,
          );
          this.emit(
            `  store ${enumTypeName} ${leftVal}, ${enumTypeName}* ${leftPtr}`,
          );

          const rightPtr = this.allocateStack(
            `enum_cmp_right_${this.labelCount++}`,
            enumTypeName,
          );
          this.emit(
            `  store ${enumTypeName} ${rightVal}, ${enumTypeName}* ${rightPtr}`,
          );

          // Get pointer to data field (index 1) for both enums
          const leftDataPtr = this.newRegister();
          this.emit(
            `  ${leftDataPtr} = getelementptr inbounds ${enumTypeName}, ${enumTypeName}* ${leftPtr}, i32 0, i32 1`,
          );
          const leftDataI8Ptr = this.newRegister();
          this.emit(
            `  ${leftDataI8Ptr} = bitcast [${dataSize} x i8]* ${leftDataPtr} to i8*`,
          );

          const rightDataPtr = this.newRegister();
          this.emit(
            `  ${rightDataPtr} = getelementptr inbounds ${enumTypeName}, ${enumTypeName}* ${rightPtr}, i32 0, i32 1`,
          );
          const rightDataI8Ptr = this.newRegister();
          this.emit(
            `  ${rightDataI8Ptr} = bitcast [${dataSize} x i8]* ${rightDataPtr} to i8*`,
          );

          // Use memcmp to compare data bytes
          const memcmpResult = this.newRegister();
          this.emit(
            `  ${memcmpResult} = call i32 @memcmp(i8* ${leftDataI8Ptr}, i8* ${rightDataI8Ptr}, i64 ${dataSize})`,
          );

          const dataEqual = this.newRegister();
          this.emit(`  ${dataEqual} = icmp eq i32 ${memcmpResult}, 0`);

          // Both tags and data must be equal
          const result = this.newRegister();
          this.emit(`  ${result} = and i1 ${tagsEqual}, ${dataEqual}`);

          if (expr.operator.type === TokenType.BangEqual) {
            const notResult = this.newRegister();
            this.emit(`  ${notResult} = xor i1 ${result}, true`);
            return notResult;
          }
          return result;
        } else {
          // No data field, just compare tags
          if (expr.operator.type === TokenType.BangEqual) {
            const notResult = this.newRegister();
            this.emit(`  ${notResult} = xor i1 ${tagsEqual}, true`);
            return notResult;
          }
          return tagsEqual;
        }
      }
    }

    // Pointer arithmetic
    if (leftType.endsWith("*") && this.isIntegerType(rightType)) {
      // ptr + int
      let right = rightRaw;
      if (rightType !== "i64") {
        const castReg = this.newRegister();
        if (this.isSigned(expr.right.resolvedType!)) {
          this.emit(`  ${castReg} = sext ${rightType} ${rightRaw} to i64`);
        } else {
          this.emit(`  ${castReg} = zext ${rightType} ${rightRaw} to i64`);
        }
        right = castReg;
      }

      if (expr.operator.type === TokenType.Plus) {
        const reg = this.newRegister();
        this.emit(
          `  ${reg} = getelementptr inbounds ${leftType.slice(
            0,
            -1,
          )}, ${leftType} ${leftRaw}, i64 ${right}`,
        );
        return reg;
      } else if (expr.operator.type === TokenType.Minus) {
        // ptr - int -> ptr + (-int)
        const negRight = this.newRegister();
        this.emit(`  ${negRight} = sub i64 0, ${right}`);
        const reg = this.newRegister();
        this.emit(
          `  ${reg} = getelementptr inbounds ${leftType.slice(
            0,
            -1,
          )}, ${leftType} ${leftRaw}, i64 ${negRight}`,
        );
        return reg;
      }
    }

    // int + ptr (commutative)
    if (
      this.isIntegerType(leftType) &&
      rightType.endsWith("*") &&
      expr.operator.type === TokenType.Plus
    ) {
      let left = leftRaw;
      if (leftType !== "i64") {
        const castReg = this.newRegister();
        if (this.isSigned(expr.left.resolvedType!)) {
          this.emit(`  ${castReg} = sext ${leftType} ${leftRaw} to i64`);
        } else {
          this.emit(`  ${castReg} = zext ${leftType} ${leftRaw} to i64`);
        }
        left = castReg;
      }

      const reg = this.newRegister();
      this.emit(
        `  ${reg} = getelementptr inbounds ${rightType.slice(
          0,
          -1,
        )}, ${rightType} ${rightRaw}, i64 ${left}`,
      );
      return reg;
    }

    const left = leftRaw;
    const right = rightRaw;

    // Check if we're dealing with floating point types
    const isFloat = leftType === "double" || leftType === "float";
    const isUnsigned = !isFloat && !this.isSigned(expr.left.resolvedType!);

    let op = "";
    switch (expr.operator.type) {
      case TokenType.Plus:
        op = isFloat ? "fadd" : "add";
        break;
      case TokenType.Minus:
        op = isFloat ? "fsub" : "sub";
        break;
      case TokenType.Star:
        op = isFloat ? "fmul" : "mul";
        break;
      case TokenType.Slash:
        if (isFloat) op = "fdiv";
        else op = isUnsigned ? "udiv" : "sdiv";
        break;
      case TokenType.EqualEqual:
        op = isFloat ? "fcmp oeq" : "icmp eq";
        break;
      case TokenType.BangEqual:
        op = isFloat ? "fcmp one" : "icmp ne";
        break;
      case TokenType.Less:
        if (isFloat) op = "fcmp olt";
        else op = isUnsigned ? "icmp ult" : "icmp slt";
        break;
      case TokenType.LessEqual:
        if (isFloat) op = "fcmp ole";
        else op = isUnsigned ? "icmp ule" : "icmp sle";
        break;
      case TokenType.Greater:
        if (isFloat) op = "fcmp ogt";
        else op = isUnsigned ? "icmp ugt" : "icmp sgt";
        break;
      case TokenType.GreaterEqual:
        if (isFloat) op = "fcmp oge";
        else op = isUnsigned ? "icmp uge" : "icmp sge";
        break;
      case TokenType.Percent:
        if (isFloat) op = "frem";
        else op = isUnsigned ? "urem" : "srem";
        break;
      case TokenType.Ampersand:
        op = "and";
        break;
      case TokenType.Pipe:
        op = "or";
        break;
      case TokenType.Caret:
        op = "xor";
        break;
      case TokenType.LessLess:
        op = "shl";
        break;
      case TokenType.GreaterGreater:
        op = isUnsigned ? "lshr" : "ashr";
        break;
    }

    if (op) {
      const reg = this.newRegister();
      this.emit(`  ${reg} = ${op} ${leftType} ${left}, ${right}`);
      return reg;
    }
    return "0";
  }

  private findMethodOwner(
    structName: string,
    methodName: string,
  ): AST.StructDecl | null {
    const decl = this.structMap.get(structName);
    if (!decl) return null;

    // Check members
    if (
      decl.members.some(
        (m) => m.kind === "FunctionDecl" && m.name === methodName,
      )
    ) {
      return decl;
    }

    // Check parents
    for (const parent of decl.inheritanceList) {
      if (parent.kind === "BasicType") {
        let parentName = parent.name;
        // Use resolved declaration if available (handles imports)
        if (
          parent.resolvedDeclaration &&
          (parent.resolvedDeclaration as any).kind === "StructDecl"
        ) {
          parentName = (parent.resolvedDeclaration as any).name;
        }

        const owner = this.findMethodOwner(parentName, methodName);
        if (owner) return owner;
      }
    }

    return null;
  }

  private generateCall(expr: AST.CallExpr): string {
    // Check for enum variant constructor
    const enumVariantInfo = (expr as any).enumVariantInfo;
    if (enumVariantInfo) {
      // This is an enum variant constructor call
      const enumDecl = enumVariantInfo.enumDecl as AST.EnumDecl;
      const variant = enumVariantInfo.variant as AST.EnumVariant;
      const variantIndex = enumVariantInfo.variantIndex as number;

      // Generate code to construct the enum value
      const enumType = this.resolveType(expr.callee.resolvedType!);

      // Allocate space on stack to build the enum value
      const enumPtr = this.newRegister();
      this.emit(`  ${enumPtr} = alloca ${enumType}`);

      // Get pointer to tag field and store the discriminant
      const tagPtr = this.newRegister();
      this.emit(
        `  ${tagPtr} = getelementptr inbounds ${enumType}, ${enumType}* ${enumPtr}, i32 0, i32 0`,
      );
      this.emit(`  store i32 ${variantIndex}, i32* ${tagPtr}`);

      // Handle tuple/struct data if present
      if (variant.dataType && expr.args.length > 0) {
        // Get pointer to data field
        const dataPtr = this.newRegister();
        this.emit(
          `  ${dataPtr} = getelementptr inbounds ${enumType}, ${enumType}* ${enumPtr}, i32 0, i32 1`,
        );

        if (variant.dataType.kind === "EnumVariantTuple") {
          // Get enum name from type (strip "%enum." prefix)
          const enumName = enumType.substring(6);
          const dataSize = this.enumDataSizes.get(enumName) || 64;

          // Store each argument in sequence in the data array with proper byte offsets
          const bytePtr = this.newRegister();
          this.emit(
            `  ${bytePtr} = bitcast [${dataSize} x i8]* ${dataPtr} to i8*`,
          );

          let byteOffset = 0;
          for (let i = 0; i < expr.args.length; i++) {
            const argValue = this.generateExpression(expr.args[i]!);
            const argType = this.resolveType(expr.args[i]!.resolvedType!);
            const argSize = this.getTypeSize(argType);

            // Align the offset based on type size
            const alignment =
              argSize >= 8 ? 8 : argSize >= 4 ? 4 : argSize >= 2 ? 2 : 1;
            if (byteOffset % alignment !== 0) {
              byteOffset = Math.ceil(byteOffset / alignment) * alignment;
            }

            // Get pointer at the correct byte offset
            let storePtr: string;
            if (byteOffset === 0) {
              storePtr = this.newRegister();
              this.emit(
                `  ${storePtr} = bitcast i8* ${bytePtr} to ${argType}*`,
              );
            } else {
              const offsetPtr = this.newRegister();
              this.emit(
                `  ${offsetPtr} = getelementptr i8, i8* ${bytePtr}, i32 ${byteOffset}`,
              );
              storePtr = this.newRegister();
              this.emit(
                `  ${storePtr} = bitcast i8* ${offsetPtr} to ${argType}*`,
              );
            }

            // Store the value
            this.emit(
              `  store ${argType} ${argValue}, ${argType}* ${storePtr}`,
            );

            byteOffset += argSize;
          }
        }
        // TODO: Handle EnumVariantStruct similarly
      }

      // Load the constructed enum value
      const result = this.newRegister();
      this.emit(`  ${result} = load ${enumType}, ${enumType}* ${enumPtr}`);

      return result;
    }

    // Check for operator overload (__call__)
    if (expr.operatorOverload) {
      const overload = expr.operatorOverload;
      const method = overload.methodDeclaration;
      const calleeRaw = this.generateExpression(expr.callee);

      // Get the struct name from the target type
      const targetType = overload.targetType as AST.BasicTypeNode;
      const structName = targetType.name;

      // Build the method name with struct prefix
      const methodType = method.resolvedType as AST.FunctionTypeNode;
      const fullMethodName = `${structName}_${method.name}`;
      const mangledName = this.getMangledName(fullMethodName, methodType);

      // Get address of callee (this pointer)
      const calleeType = this.resolveType(expr.callee.resolvedType!);
      let thisPtr: string;
      try {
        thisPtr = this.generateAddress(expr.callee);
      } catch {
        // If we can't get address, spill to stack
        const spillAddr = this.allocateStack(
          `op_spill_${this.labelCount++}`,
          calleeType,
        );
        this.emit(
          `  store ${calleeType} ${calleeRaw}, ${calleeType}* ${spillAddr}`,
        );
        thisPtr = spillAddr;
      }

      // Generate arguments
      const argRegs: string[] = [];
      const argTypes: string[] = [];
      for (const arg of expr.args) {
        const argVal = this.generateExpression(arg);
        const argType = this.resolveType(arg.resolvedType!);
        argRegs.push(argVal);
        argTypes.push(argType);
      }

      // Build argument list for call: this pointer + actual args
      const callArgs = [`${calleeType}* ${thisPtr}`];
      for (let i = 0; i < argRegs.length; i++) {
        callArgs.push(`${argTypes[i]} ${argRegs[i]}`);
      }

      // Call the __call__ method
      const returnType = this.resolveType(method.returnType);
      const resultReg = this.newRegister();
      this.emit(
        `  ${resultReg} = call ${returnType} @${mangledName}(${callArgs.join(", ")})`,
      );
      return resultReg;
    }

    let funcName = "";
    let argsToGenerate = expr.args;
    let isInstanceCall = false;
    let targetThisType: string | undefined;

    let callee = expr.callee;
    let genericArgs = expr.genericArgs || [];
    const callSubstitutionMap = new Map<string, AST.TypeNode>();

    // Handle generic instantiation expression
    if (callee.kind === "GenericInstantiation") {
      const genExpr = callee as AST.GenericInstantiationExpr;
      callee = genExpr.base;
      genericArgs = genExpr.genericArgs;
    }

    if (callee.kind === "Identifier") {
      const ident = callee as AST.IdentifierExpr;
      funcName = ident.name;

      // Handle generic function call
      if (genericArgs.length > 0) {
        // Find declaration
        // We rely on resolvedType having the declaration
        const funcType = ident.resolvedType as AST.FunctionTypeNode;
        if (funcType && funcType.declaration) {
          funcName = this.resolveMonomorphizedFunction(
            funcType.declaration,
            genericArgs,
          );
          if (
            funcType.declaration.genericParams.length === genericArgs.length
          ) {
            for (let k = 0; k < genericArgs.length; k++) {
              callSubstitutionMap.set(
                funcType.declaration.genericParams[k]!.name,
                genericArgs[k]!,
              );
            }
          }
        } else {
          // Maybe it's a struct constructor?
          // If 'resolvedType' is null or no declaration, we can't morph.
          // But let's assume valid typed AST.
        }
      } else if (expr.resolvedDeclaration) {
        const decl = expr.resolvedDeclaration;
        if (decl.kind === "Extern") {
          funcName = decl.name;
        } else {
          if (decl.resolvedType && decl.resolvedType.kind === "FunctionType") {
            funcName = this.getMangledName(
              decl.name,
              decl.resolvedType as AST.FunctionTypeNode,
            );
          } else {
            funcName = decl.name;
          }
        }
      }
    } else if (callee.kind === "Member") {
      const memberExpr = callee as AST.MemberExpr;
      const objType = memberExpr.object.resolvedType;

      if (!objType) throw new Error("Member access on unresolved type");

      if ((objType as any).kind === "ModuleType") {
        funcName = memberExpr.property;
      } else {
        let structName = "";
        let contextMap: Map<string, AST.TypeNode> | undefined;
        let prefix: string | undefined;

        if (objType.kind === "BasicType") {
          // Use resolved type name to handle monomorphization
          const typeStr = this.resolveType(objType);
          // typeStr is %struct.Box_i32 or %struct.Box
          // we need the clean name

          let cleanType = typeStr;
          // Strip pointers
          while (cleanType.endsWith("*")) {
            cleanType = cleanType.slice(0, -1);
          }
          // Strip arrays [N x ...]
          while (cleanType.startsWith("[")) {
            // Extract inner type "x Inner]"
            const match = cleanType.match(/^\[\d+ x (.+)\]$/);
            if (match) {
              cleanType = match[1]!;
            } else {
              break;
            }
          }

          if (cleanType.startsWith("%struct.")) {
            structName = cleanType.substring(8);
          } else if (PRIMITIVE_STRUCT_MAP[objType.name]) {
            structName = PRIMITIVE_STRUCT_MAP[objType.name]!;
            targetThisType = `%struct.${structName}*`;
          } else if (PRIMITIVE_STRUCT_MAP[cleanType]) {
            structName = PRIMITIVE_STRUCT_MAP[cleanType]!;
            targetThisType = `%struct.${structName}*`;
          } else {
            structName = objType.name;
          }

          prefix = structName; // e.g. Box_double

          // Instance call: pass object as first argument
          argsToGenerate = [memberExpr.object, ...expr.args];
          isInstanceCall = true;

          // Prepare context if object is instantiated generic struct
          const structDecl = this.structMap.get(objType.name); // Original generic struct
          if (
            structDecl &&
            structDecl.genericParams.length > 0 &&
            objType.genericArgs.length > 0
          ) {
            contextMap = new Map();
            for (let i = 0; i < structDecl.genericParams.length; i++) {
              if (i < objType.genericArgs.length) {
                let genericArg = objType.genericArgs[i]!;
                // Substitute any generic parameters in the argument using currentTypeMap
                // This handles cases like Array<Pair<K, V>> where K, V need to be resolved
                if (this.currentTypeMap.size > 0) {
                  genericArg = this.substituteType(
                    genericArg,
                    this.currentTypeMap,
                  );
                }
                contextMap.set(structDecl.genericParams[i]!.name, genericArg);
                callSubstitutionMap.set(
                  structDecl.genericParams[i]!.name,
                  genericArg,
                );
              }
            }
          }
        } else if (objType.kind === "MetaType") {
          const inner = (objType as any).type;
          if (inner.kind === "BasicType") {
            structName = inner.name;

            // Handle generic static calls - need monomorphized name
            if (inner.genericArgs && inner.genericArgs.length > 0) {
              // Resolve the monomorphized struct name
              const structDecl = this.structMap.get(inner.name);
              if (structDecl && structDecl.genericParams.length > 0) {
                // Build contextMap for generic substitution
                contextMap = new Map();
                for (let i = 0; i < structDecl.genericParams.length; i++) {
                  if (i < inner.genericArgs.length) {
                    let genericArg = inner.genericArgs[i]!;
                    // Substitute any generic parameters in the argument using currentTypeMap
                    // This handles cases like Option<V> where V needs to be resolved to concrete type
                    if (this.currentTypeMap.size > 0) {
                      genericArg = this.substituteType(
                        genericArg,
                        this.currentTypeMap,
                      );
                    }
                    contextMap.set(
                      structDecl.genericParams[i]!.name,
                      genericArg,
                    );
                    callSubstitutionMap.set(
                      structDecl.genericParams[i]!.name,
                      genericArg,
                    );
                  }
                }

                // Mangle the struct name using the same approach as resolveMonomorphizedType
                // But first substitute any generic parameters
                const substitutedArgs = inner.genericArgs.map(
                  (arg: AST.TypeNode) =>
                    this.substituteType(arg, this.currentTypeMap),
                );
                const argNames = substitutedArgs
                  .map((arg: AST.TypeNode) => this.mangleType(arg))
                  .join("_");
                structName = `${inner.name}_${argNames}`;
                prefix = structName;
              }
            }
            // Static call: no extra argument
          } else {
            throw new Error("Static member access on non-struct type");
          }
        } else {
          throw new Error("Member access on non-struct type");
        }

        // Check for inherited method
        const ownerDecl = this.findMethodOwner(structName, memberExpr.property);
        if (
          ownerDecl &&
          ownerDecl.name !== (objType as AST.BasicTypeNode).name
        ) {
          // Inherited method
          if (ownerDecl.genericParams.length === 0) {
            // Parent is not generic, use its name directly
            structName = ownerDecl.name;
            targetThisType = `%struct.${structName}*`;
          } else {
            // Generic parent inheritance
            const childDecl = this.structMap.get(
              (objType as AST.BasicTypeNode).name,
            );
            if (childDecl) {
              const parentType = this.findInstantiatedParentType(
                childDecl,
                objType as AST.BasicTypeNode,
                ownerDecl.name,
              );

              if (parentType) {
                const llvmType = this.resolveMonomorphizedType(
                  ownerDecl,
                  parentType.genericArgs,
                );
                structName = llvmType.substring(8); // Strip %struct.
                targetThisType = `${llvmType}*`;

                // Populate callSubstitutionMap for generic parent
                if (ownerDecl.genericParams.length > 0) {
                  for (let i = 0; i < ownerDecl.genericParams.length; i++) {
                    if (i < parentType.genericArgs.length) {
                      callSubstitutionMap.set(
                        ownerDecl.genericParams[i]!.name,
                        parentType.genericArgs[i]!,
                      );
                      // Also populate contextMap for mangling
                      if (!contextMap) contextMap = new Map();
                      contextMap.set(
                        ownerDecl.genericParams[i]!.name,
                        parentType.genericArgs[i]!,
                      );
                    }
                  }
                }
              }
            }
          }
        }

        funcName = `${structName}_${memberExpr.property}`;

        let decl = expr.resolvedDeclaration;

        // If we found a concrete owner, try to find the method declaration there
        // This fixes issues where TypeChecker resolved to interface/parent method
        // but we are calling a concrete implementation with different signature (e.g. 'this' type)
        if (ownerDecl) {
          // Check if the resolved declaration is already in the owner
          // If it is, we respect the TypeChecker's choice (handles overloads)
          const isDeclaredInOwner =
            decl && ownerDecl.members.includes(decl as any);

          if (!isDeclaredInOwner) {
            const candidates = ownerDecl.members.filter(
              (m) =>
                m.kind === "FunctionDecl" && m.name === memberExpr.property,
            ) as AST.FunctionDecl[];

            if (candidates.length === 1) {
              decl = candidates[0];
            } else if (
              candidates.length > 1 &&
              decl &&
              decl.kind === "FunctionDecl"
            ) {
              // Multiple overloads in owner - try to match signature of original decl
              const targetParams = (decl as AST.FunctionDecl).params;
              // Skip 'this' (first param)
              const targetParamTypes = targetParams.slice(1).map((p) => p.type);

              const match = candidates.find((c) => {
                const cParams = c.params.slice(1).map((p) => p.type);
                if (cParams.length !== targetParamTypes.length) return false;
                // Compare resolved types
                return cParams.every(
                  (t, i) =>
                    this.resolveType(t) ===
                    this.resolveType(targetParamTypes[i]!),
                );
              });

              if (match) {
                decl = match;
              }
            }
          }
        }

        if (
          !decl &&
          callee.resolvedType &&
          (callee.resolvedType as any).declaration
        ) {
          decl = (callee.resolvedType as any).declaration;
        }

        if (decl) {
          if (decl.resolvedType && decl.resolvedType.kind === "FunctionType") {
            let funcTypeToMangle = decl.resolvedType as AST.FunctionTypeNode;
            // Substitute generic types before mangling
            // Merge currentTypeMap and contextMap to handle nested generics
            // e.g., calling Array<Pair<K, V>>.destroy() needs both T->Pair and K,V mappings
            const substitutionMap = new Map<string, AST.TypeNode>();
            if (this.currentTypeMap.size > 0) {
              for (const [k, v] of this.currentTypeMap) {
                substitutionMap.set(k, v);
              }
            }
            if (contextMap) {
              for (const [k, v] of contextMap) {
                // contextMap takes precedence for the target type's generics
                substitutionMap.set(k, v);
              }
            }
            if (substitutionMap.size > 0) {
              funcTypeToMangle = this.substituteType(
                funcTypeToMangle,
                substitutionMap,
              ) as AST.FunctionTypeNode;
            }
            funcName = this.getMangledName(funcName, funcTypeToMangle);
          }
        }

        // Handle generic method call
        if (genericArgs.length > 0) {
          const funcType = expr.callee.resolvedType as AST.FunctionTypeNode;
          if (funcType && funcType.declaration) {
            funcName = this.resolveMonomorphizedFunction(
              funcType.declaration,
              genericArgs,
              contextMap,
              prefix,
            );
            if (
              funcType.declaration.genericParams.length === genericArgs.length
            ) {
              for (let k = 0; k < genericArgs.length; k++) {
                callSubstitutionMap.set(
                  funcType.declaration.genericParams[k]!.name,
                  genericArgs[k]!,
                );
              }
            }
          }
        }
      }
    }
    let callTarget = "";
    // If identifier and local, indirect call
    if (callee.kind === "Identifier") {
      const ident = callee as AST.IdentifierExpr;
      if (this.locals.has(ident.name)) {
        // Indirect call
        const funcSig = this.resolveType(ident.resolvedType!);
        const addr = this.generateAddress(ident);
        const loadedPtr = this.newRegister();
        // addr is funcSig**
        this.emit(`  ${loadedPtr} = load ${funcSig}, ${funcSig}* ${addr}`);
        callTarget = loadedPtr;
      } else {
        callTarget = `@${funcName}`;
      }
    } else if (callee.kind === "Member") {
      const memberExpr = callee as AST.MemberExpr;
      const objType = memberExpr.object.resolvedType as AST.BasicTypeNode;
      if (objType && objType.kind === "BasicType") {
        let structName = objType.name;
        if (this.currentTypeMap.has(structName)) {
          const typeStr = this.resolveType(objType); // %struct.Name
          if (typeStr.startsWith("%struct.")) {
            structName = typeStr.substring(8);
            while (structName.endsWith("*"))
              structName = structName.slice(0, -1);
          }
        }

        // Check layout
        const layout = this.structLayouts.get(structName);
        if (layout && layout.has(memberExpr.property)) {
          // It IS a field! Indirect call.
          // We should generate the member access to get the pointer.
          const ptrToFuncPtr = this.generateMember(memberExpr); // Get address of field
          const funcSig = this.resolveType(callee.resolvedType!);
          const loadedPtr = this.newRegister();
          this.emit(
            `  ${loadedPtr} = load ${funcSig}, ${funcSig}* ${ptrToFuncPtr}`,
          );
          callTarget = loadedPtr;

          // Reset args (remove "this" injection done for methods)
          if (isInstanceCall) {
            argsToGenerate = expr.args; // Revert to original args
            isInstanceCall = false;
          }
        } else {
          callTarget = `@${funcName}`;
        }
      } else {
        callTarget = `@${funcName}`;
      }
    } else {
      // Other expressions (Index, Call, etc) evaluating to function pointer
      // e.g. arr[0]()
      const funcSig = this.resolveType(callee.resolvedType!);
      const ptrVal = this.generateExpression(callee);
      callTarget = ptrVal;
    }

    const funcType = expr.callee.resolvedType as AST.FunctionTypeNode;
    if (!funcType) {
      console.log(`[DEBUG] generateCall failed for ${funcName}`);
      console.log(`[DEBUG] callee kind: ${expr.callee.kind}`);
      if (expr.callee.kind === "Member") {
        const m = expr.callee as AST.MemberExpr;
        console.log(`[DEBUG] member: ${m.property}`);
        console.log(`[DEBUG] object resolvedType:`, m.object.resolvedType);
      }
      throw new Error(`Function call '${funcName}' has no resolved type`);
    }

    if (
      funcType.declaration &&
      (funcType.declaration as any).kind === "SpecMethod"
    ) {
      if (isInstanceCall) {
        const memberExpr = callee as AST.MemberExpr;
        const objType = memberExpr.object.resolvedType;
        if (objType) {
          callSubstitutionMap.set("Self", objType);
        }
      }
    }

    const args = argsToGenerate
      .map((arg, i) => {
        let targetTypeNode: AST.TypeNode | undefined;

        if (isInstanceCall) {
          if (i === 0) {
            if (
              funcType.declaration &&
              funcType.declaration.params.length > 0
            ) {
              targetTypeNode = funcType.declaration.params[0]!.type;
            } else {
              targetTypeNode = arg.resolvedType;
            }
          } else {
            if (i - 1 < funcType.paramTypes.length) {
              targetTypeNode = funcType.paramTypes[i - 1];
            }
          }
        } else {
          if (i < funcType.paramTypes.length) {
            targetTypeNode = funcType.paramTypes[i];
          }
        }

        if (targetTypeNode) {
          // Apply substitution
          if (callSubstitutionMap.size > 0) {
            targetTypeNode = this.substituteType(
              targetTypeNode,
              callSubstitutionMap,
            );
          }

          const destType = this.resolveType(targetTypeNode);
          const srcType = this.resolveType(arg.resolvedType!);

          // Handle 'this' pointer cast for inherited methods
          if (
            isInstanceCall &&
            i === 0 &&
            targetThisType &&
            srcType !== targetThisType
          ) {
            let ptrVal: string;
            let ptrType: string;

            if (srcType.endsWith("*")) {
              ptrVal = this.generateExpression(arg);
              ptrType = srcType;
            } else {
              // Try to get address
              try {
                ptrVal = this.generateAddress(arg);
                ptrType = srcType + "*";
              } catch {
                // Spill to stack
                const val = this.generateExpression(arg);
                const spill = this.allocateStack(
                  `spill_${this.labelCount++}`,
                  srcType,
                );
                this.emit(`  store ${srcType} ${val}, ${srcType}* ${spill}`);
                ptrVal = spill;
                ptrType = srcType + "*";
              }
            }

            const castReg = this.newRegister();
            this.emit(
              `  ${castReg} = bitcast ${ptrType} ${ptrVal} to ${targetThisType}`,
            );

            // Check if the function expects a value or a pointer
            if (destType === targetThisType) {
              return `${targetThisType} ${castReg}`;
            } else if (targetThisType === destType + "*") {
              // Function expects value, load it from the casted pointer
              const loaded = this.newRegister();
              this.emit(
                `  ${loaded} = load ${destType}, ${targetThisType} ${castReg}`,
              );
              return `${destType} ${loaded}`;
            }
            // Fallback: return casted pointer (might be wrong if types don't match, but better than nothing)
            return `${targetThisType} ${castReg}`;
          }

          // Optimize for L-values passing to pointer: take address directly (T -> *T)
          if (destType === srcType + "*") {
            if (
              arg.kind === "Identifier" ||
              arg.kind === "Member" ||
              arg.kind === "Index"
            ) {
              const addr = this.generateAddress(arg as any);
              return `${destType} ${addr}`;
            }
          }

          if (srcType.startsWith("[") && destType.endsWith("*")) {
            if (
              arg.kind === "Identifier" ||
              arg.kind === "Member" ||
              arg.kind === "Index"
            ) {
              const addr = this.generateAddress(arg as any);

              const decayReg = this.newRegister();
              this.emit(
                `  ${decayReg} = getelementptr inbounds ${srcType}, ${srcType}* ${addr}, i64 0, i64 0`,
              );
              return `${destType} ${decayReg}`;
            }
          }

          const val = this.generateExpression(arg);
          const castVal = this.emitCast(
            val,
            srcType,
            destType,
            arg.resolvedType!,
            targetTypeNode,
          );
          return `${destType} ${castVal}`;
        }

        const val = this.generateExpression(arg);
        const srcType = this.resolveType(arg.resolvedType!);

        // For variadic arguments, promote i1 to i32 (C convention)
        if (srcType === "i1" && funcType.isVariadic) {
          const promoted = this.newRegister();
          this.emit(`  ${promoted} = zext i1 ${val} to i32`);
          return `i32 ${promoted}`;
        }

        return `${srcType} ${val}`;
      })
      .join(", ");

    const retType = this.resolveType(expr.resolvedType!);
    const isVariadic = funcType.isVariadic === true;

    // Ensure external function is declared
    if (callTarget.startsWith("@")) {
      const targetName = callTarget.substring(1);
      if (
        !this.declaredFunctions.has(targetName) &&
        !this.definedFunctions.has(targetName) &&
        !this.globals.has(targetName) &&
        !this.locals.has(targetName)
      ) {
        // Emit declaration
        const paramTypes: string[] = [];

        if (isInstanceCall) {
          const memberExpr = callee as AST.MemberExpr;
          const objType = memberExpr.object.resolvedType!;
          let thisType = this.resolveType(objType);

          // Check if the function expects a pointer or value for 'this'
          const funcDecl = expr.resolvedDeclaration as AST.FunctionDecl;
          let expectsPointer = true; // Default to pointer

          if (
            funcDecl &&
            funcDecl.params.length > 0 &&
            funcDecl.params[0]!.name === "this"
          ) {
            let thisParamType = funcDecl.params[0]!.type;
            if (callSubstitutionMap.size > 0) {
              thisParamType = this.substituteType(
                thisParamType,
                callSubstitutionMap,
              );
            }
            const resolvedThisParamType = this.resolveType(thisParamType);
            expectsPointer = resolvedThisParamType.endsWith("*");
          }

          if (expectsPointer) {
            // Pass struct by pointer
            if (!thisType.endsWith("*")) {
              thisType += "*";
            }
          }
          paramTypes.push(thisType);
        }

        paramTypes.push(
          ...funcType.paramTypes.map((t) => {
            let resolved = t;
            if (callSubstitutionMap.size > 0) {
              resolved = this.substituteType(t, callSubstitutionMap);
            }

            if (
              resolved.kind === "BasicType" &&
              resolved.genericArgs.length > 0
            ) {
              const structDecl = this.structMap.get(resolved.name);
              if (structDecl) {
                let ret = this.resolveMonomorphizedType(
                  structDecl,
                  resolved.genericArgs,
                );
                for (let i = 0; i < resolved.pointerDepth; i++) ret += "*";
                return ret;
              }
            }
            return this.resolveType(resolved);
          }),
        );

        const substitutedRet =
          callSubstitutionMap.size > 0
            ? this.substituteType(funcType.returnType, callSubstitutionMap)
            : funcType.returnType;

        let retTypeStr: string;
        if (
          substitutedRet.kind === "BasicType" &&
          substitutedRet.genericArgs.length > 0
        ) {
          // Try to resolve monomorphized type directly to avoid resolveType issues with empty map
          const structDecl = this.structMap.get(substitutedRet.name);
          if (structDecl) {
            retTypeStr = this.resolveMonomorphizedType(
              structDecl,
              substitutedRet.genericArgs,
            );
            // Add pointer depth
            for (let i = 0; i < substitutedRet.pointerDepth; i++)
              retTypeStr += "*";
          } else {
            retTypeStr = this.resolveType(substitutedRet);
          }
        } else {
          retTypeStr = this.resolveType(substitutedRet);
        }

        // Check if function is already declared or defined
        if (
          !this.declaredFunctions.has(targetName) &&
          !this.definedFunctions.has(targetName)
        ) {
          let decl = `declare ${retTypeStr} @${targetName}(${paramTypes.join(", ")}`;
          if (funcType.isVariadic) {
            if (paramTypes.length > 0) decl += ", ...";
            else decl += "...";
          }
          decl += ")";

          // Check if this is a method of Type struct, which is defined internally
          if (!targetName.startsWith("Type_")) {
            this.emitDeclaration(decl);
            this.declaredFunctions.add(targetName);
          }
        }
      }
    }

    if (retType === "void") {
      if (isVariadic) {
        // Build the full signature for variadic functions
        const paramTypesStr = funcType.paramTypes
          .map((t) => this.resolveType(t))
          .join(", ");
        this.emit(`  call void (${paramTypesStr}, ...) ${callTarget}(${args})`);
      } else {
        this.emit(`  call void ${callTarget}(${args})`);
      }
      return "";
    } else {
      const reg = this.newRegister();
      if (isVariadic) {
        // Build the full signature for variadic functions
        const paramTypesStr = funcType.paramTypes
          .map((t) => this.resolveType(t))
          .join(", ");
        this.emit(
          `  ${reg} = call ${retType} (${paramTypesStr}, ...) ${callTarget}(${args})`,
        );
      } else {
        this.emit(`  ${reg} = call ${retType} ${callTarget}(${args})`);
      }
      return reg;
    }
  }

  private generateAddress(
    expr: AST.Expression,
    skipNullObjectCheck: boolean = false,
  ): string {
    if (expr.kind === "Identifier") {
      const name = (expr as AST.IdentifierExpr).name;
      if (this.locals.has(name)) {
        // Look up the actual pointer name from our map
        const ptr = this.localPointers.get(name);
        if (ptr) {
          return ptr;
        }
        // Fallback to old format if not in map (shouldn't happen, but be defensive)
        return `%${name}_ptr`;
      } else if (this.globals.has(name)) {
        return `@${name}`;
      } else {
        const ptr = this.localPointers.get(name);
        if (ptr) {
          return ptr;
        }

        // If it's a function type, it's likely a global function
        if (expr.resolvedType && expr.resolvedType.kind === "FunctionType") {
          return `@${name}`;
        }

        return `%${name}_ptr`;
      }
    } else if (expr.kind === "Member") {
      const memberExpr = expr as AST.MemberExpr;

      // Check for module access
      const objType = memberExpr.object.resolvedType;
      if (objType && (objType as any).kind === "ModuleType") {
        return `@${memberExpr.property}`;
      }

      const objectAddr = this.generateAddress(
        memberExpr.object,
        skipNullObjectCheck,
      );

      // We need the type of the object to know which struct layout to use
      // The object's resolvedType should be a BasicType with the struct name
      if (!objType || objType.kind !== "BasicType") {
        throw new Error("Member access on non-struct type");
      }

      // Use resolved name for monomorphization lookup
      // resolveType returns e.g. %struct.Box_i32 or %struct.Point
      const llvmType = this.resolveType(objType);
      let structName = objType.name;

      if (llvmType.startsWith("%struct.")) {
        structName = llvmType.substring(8);
        // strip pointers
        while (structName.endsWith("*")) structName = structName.slice(0, -1);
      }
      let layout = this.structLayouts.get(structName);
      if (!layout && structName.includes(".")) {
        const shortName = structName.split(".").pop()!;
        layout = this.structLayouts.get(shortName);
      }
      if (!layout) {
        throw new Error(`Unknown struct type: ${structName}`);
      }

      const fieldIndex = layout.get(memberExpr.property);
      if (fieldIndex === undefined) {
        throw new Error(
          `Unknown field '${memberExpr.property}' in struct '${structName}'`,
        );
      }

      let baseAddr = objectAddr;
      // If the object is a call returning a pointer, use it directly as the base.
      if (memberExpr.object.kind === "Call") {
        const objLlvmType = this.resolveType(objType);
        if (objLlvmType.endsWith("*")) {
          baseAddr = objectAddr;
        }
      } else if (objType.pointerDepth > 0) {
        const ptrReg = this.newRegister();
        const ptrType = llvmType;
        this.emit(`  ${ptrReg} = load ${ptrType}, ${ptrType}* ${objectAddr}`);
        baseAddr = ptrReg;
      }

      // Runtime null-object guard for pointer dereferences to tracked locals
      // Only check when we can trace the pointer back to &localVar
      if (
        objType.pointerDepth === 1 &&
        !skipNullObjectCheck &&
        memberExpr.object.kind === "Identifier" &&
        baseAddr
      ) {
        const ptrName = (memberExpr.object as AST.IdentifierExpr).name;
        // Check if this pointer is in our tracked pointers map
        // We'll track it when assigned from &localStruct
        const trackedLocal = this.pointerToLocal.get(ptrName);

        if (trackedLocal) {
          const flagPtr = this.localNullFlags.get(trackedLocal);
          if (flagPtr) {
            const flagVal = this.newRegister();
            this.emit(`  ${flagVal} = load i1, i1* ${flagPtr}`);

            // Negate: if flag is 0 (null), trap
            const isNull = this.newRegister();
            this.emit(`  ${isNull} = xor i1 ${flagVal}, 1`);

            const funcName = this.currentFunctionName || "unknown";
            const exprStr = `${ptrName}.${memberExpr.property}`;
            const msg = "Attempted to access member/index of null object\n";

            // Create string literals for the error struct fields
            if (!this.stringLiterals.has(msg)) {
              this.stringLiterals.set(
                msg,
                `@.null_err_msg.${this.stringLiterals.size}`,
              );
            }
            if (!this.stringLiterals.has(funcName)) {
              this.stringLiterals.set(
                funcName,
                `@.null_err_func.${this.stringLiterals.size}`,
              );
            }
            if (!this.stringLiterals.has(exprStr)) {
              this.stringLiterals.set(
                exprStr,
                `@.null_err_expr.${this.stringLiterals.size}`,
              );
            }

            const throwLabel = this.newLabel("nullptr.throw");
            const passLabel = this.newLabel("nullptr.pass");
            this.emit(
              `  br i1 ${isNull}, label %${throwLabel}, label %${passLabel}`,
            );

            this.emit(`${throwLabel}:`);
            // Create and throw NullAccessError
            const errorStruct = this.newRegister();
            const errorWithMsg = this.newRegister();
            const errorWithFunc = this.newRegister();
            const errorWithExpr = this.newRegister();
            const msgLen = msg.length + 1;
            const funcLen = funcName.length + 1;
            const exprLen = exprStr.length + 1;
            this.emit(
              `  ${errorStruct} = insertvalue %struct.NullAccessError undef, i8* getelementptr inbounds ([${msgLen} x i8], [${msgLen} x i8]* ${this.stringLiterals.get(
                msg,
              )}, i64 0, i64 0), 0`,
            );
            this.emit(
              `  ${errorWithMsg} = insertvalue %struct.NullAccessError ${errorStruct}, i8* getelementptr inbounds ([${funcLen} x i8], [${funcLen} x i8]* ${this.stringLiterals.get(
                funcName,
              )}, i64 0, i64 0), 1`,
            );
            this.emit(
              `  ${errorWithExpr} = insertvalue %struct.NullAccessError ${errorWithMsg}, i8* getelementptr inbounds ([${exprLen} x i8], [${exprLen} x i8]* ${this.stringLiterals.get(
                exprStr,
              )}, i64 0, i64 0), 2`,
            );
            this.emitThrow(errorWithExpr, "%struct.NullAccessError");

            this.emit(`${passLabel}:`);
          }
        }
      }

      // Runtime null-object guard for struct locals with tracked flags
      if (
        objType.pointerDepth === 0 &&
        memberExpr.object.kind === "Identifier" &&
        !skipNullObjectCheck
      ) {
        const idName = (memberExpr.object as AST.IdentifierExpr).name;
        const flagPtr = this.localNullFlags.get(idName);
        if (flagPtr) {
          const flagVal = this.newRegister();
          this.emit(`  ${flagVal} = load i1, i1* ${flagPtr}`);

          // Negate the flag: if it's 0 (null), we want to trap
          const negFlag = this.newRegister();
          this.emit(`  ${negFlag} = xor i1 ${flagVal}, 1`);

          const funcName = this.currentFunctionName || "unknown";
          const memberName = memberExpr.property;
          const exprStr = `${idName}.${memberName}`;
          const msg = "Attempted to access member of null object";

          // Create string literals for the error struct fields
          if (!this.stringLiterals.has(msg)) {
            this.stringLiterals.set(
              msg,
              `@.null_err_msg.${this.stringLiterals.size}`,
            );
          }
          if (!this.stringLiterals.has(funcName)) {
            this.stringLiterals.set(
              funcName,
              `@.null_err_func.${this.stringLiterals.size}`,
            );
          }
          if (!this.stringLiterals.has(exprStr)) {
            this.stringLiterals.set(
              exprStr,
              `@.null_err_expr.${this.stringLiterals.size}`,
            );
          }

          const throwLabel = this.newLabel("nullobj.throw");
          const passLabel = this.newLabel("nullobj.pass");
          this.emit(
            `  br i1 ${negFlag}, label %${throwLabel}, label %${passLabel}`,
          );

          // Throw NullAccessError
          this.emit(`${throwLabel}:`);
          const errorStruct = this.newRegister();
          const errorWithMsg = this.newRegister();
          const errorWithFunc = this.newRegister();
          const errorWithExpr = this.newRegister();
          const msgLen = msg.length + 1;
          const funcLen = funcName.length + 1;
          const exprLen = exprStr.length + 1;
          this.emit(
            `  ${errorStruct} = insertvalue %struct.NullAccessError undef, i8* getelementptr inbounds ([${msgLen} x i8], [${msgLen} x i8]* ${this.stringLiterals.get(
              msg,
            )}, i64 0, i64 0), 0`,
          );
          this.emit(
            `  ${errorWithMsg} = insertvalue %struct.NullAccessError ${errorStruct}, i8* getelementptr inbounds ([${funcLen} x i8], [${funcLen} x i8]* ${this.stringLiterals.get(
              funcName,
            )}, i64 0, i64 0), 1`,
          );
          this.emit(
            `  ${errorWithExpr} = insertvalue %struct.NullAccessError ${errorWithMsg}, i8* getelementptr inbounds ([${exprLen} x i8], [${exprLen} x i8]* ${this.stringLiterals.get(
              exprStr,
            )}, i64 0, i64 0), 2`,
          );
          this.emitThrow(errorWithExpr, "%struct.NullAccessError");

          // Continue normal path
          this.emit(`${passLabel}:`);
        }
      }

      // General null-object guard for any struct value (not just identifiers)
      // This handles cases like arr[1].data where the object is not an identifier
      if (
        objType.pointerDepth === 0 &&
        memberExpr.object.kind !== "Identifier" &&
        !skipNullObjectCheck &&
        layout.has("__null_bit__")
      ) {
        // Generate the object value first so we can check its null bit
        const tempObjReg = this.newRegister();
        const objLlvmType = this.resolveType(objType);
        this.emit(
          `  ${tempObjReg} = load ${objLlvmType}, ${objLlvmType}* ${baseAddr}`,
        );

        // Extract the __null_bit__ field
        const nullBitIndex = layout.get("__null_bit__")!;
        const nullBitVal = this.newRegister();
        this.emit(
          `  ${nullBitVal} = extractvalue ${objLlvmType} ${tempObjReg}, ${nullBitIndex}`,
        );

        // Negate: if bit is 0 (null), trap
        const isNull = this.newRegister();
        this.emit(`  ${isNull} = xor i1 ${nullBitVal}, 1`);

        const funcName = this.currentFunctionName || "unknown";
        const exprStr =
          this.expressionToString(memberExpr.object) +
          `.${memberExpr.property}`;
        const msg = "Attempted to access member of null object";

        // Create string literals
        if (!this.stringLiterals.has(msg)) {
          this.stringLiterals.set(
            msg,
            `@.null_err_msg.${this.stringLiterals.size}`,
          );
        }
        if (!this.stringLiterals.has(funcName)) {
          this.stringLiterals.set(
            funcName,
            `@.null_err_func.${this.stringLiterals.size}`,
          );
        }
        if (!this.stringLiterals.has(exprStr)) {
          this.stringLiterals.set(
            exprStr,
            `@.null_err_expr.${this.stringLiterals.size}`,
          );
        }

        const throwLabel = this.newLabel("nullobj.throw");
        const passLabel = this.newLabel("nullobj.pass");
        this.emit(
          `  br i1 ${isNull}, label %${throwLabel}, label %${passLabel}`,
        );

        // Throw NullAccessError
        this.emit(`${throwLabel}:`);
        const errorStruct = this.newRegister();
        const errorWithMsg = this.newRegister();
        const errorWithFunc = this.newRegister();
        const errorWithExpr = this.newRegister();
        const msgLen = msg.length + 1;
        const funcLen = funcName.length + 1;
        const exprLen = exprStr.length + 1;
        this.emit(
          `  ${errorStruct} = insertvalue %struct.NullAccessError undef, i8* getelementptr inbounds ([${msgLen} x i8], [${msgLen} x i8]* ${this.stringLiterals.get(
            msg,
          )}, i64 0, i64 0), 0`,
        );
        this.emit(
          `  ${errorWithMsg} = insertvalue %struct.NullAccessError ${errorStruct}, i8* getelementptr inbounds ([${funcLen} x i8], [${funcLen} x i8]* ${this.stringLiterals.get(
            funcName,
          )}, i64 0, i64 0), 1`,
        );
        this.emit(
          `  ${errorWithExpr} = insertvalue %struct.NullAccessError ${errorWithMsg}, i8* getelementptr inbounds ([${exprLen} x i8], [${exprLen} x i8]* ${this.stringLiterals.get(
            exprStr,
          )}, i64 0, i64 0), 2`,
        );
        this.emitThrow(errorWithExpr, "%struct.NullAccessError");

        // Continue normal path
        this.emit(`${passLabel}:`);
      }

      const structBase = `%struct.${structName}`;

      const addr = this.newRegister();
      this.emit(
        `  ${addr} = getelementptr inbounds ${structBase}, ${structBase}* ${baseAddr}, i32 0, i32 ${fieldIndex}`,
      );
      return addr;
    } else if (expr.kind === "Index") {
      const indexExpr = expr as AST.IndexExpr;
      const objectAddr = this.generateAddress(
        indexExpr.object,
        skipNullObjectCheck,
      );
      const indexValRaw = this.generateExpression(indexExpr.index);

      // Cast index to i64 if needed
      const indexType = this.resolveType(indexExpr.index.resolvedType!);
      let indexVal = indexValRaw;
      if (indexType !== "i64") {
        const castReg = this.newRegister();
        if (this.isSigned(indexExpr.index.resolvedType!)) {
          this.emit(`  ${castReg} = sext ${indexType} ${indexValRaw} to i64`);
        } else {
          this.emit(`  ${castReg} = zext ${indexType} ${indexValRaw} to i64`);
        }
        indexVal = castReg;
      }

      const objType = indexExpr.object.resolvedType;
      if (!objType || objType.kind !== "BasicType") {
        throw new Error("Indexing non-basic type");
      }

      let addr: string;
      if (objType.arrayDimensions.length > 0) {
        const llvmType = this.resolveType(objType);
        addr = this.newRegister();
        if (llvmType.startsWith("[")) {
          this.emit(
            `  ${addr} = getelementptr inbounds ${llvmType}, ${llvmType}* ${objectAddr}, i64 0, i64 ${indexVal}`,
          );
        } else {
          // Pointer
          this.emit(
            `  ${addr} = getelementptr inbounds ${llvmType}, ${llvmType}* ${objectAddr}, i64 ${indexVal}`,
          );
        }
      } else if (objType.pointerDepth > 0) {
        const ptrReg = this.newRegister();
        const ptrType = this.resolveType(objType); // T*
        this.emit(`  ${ptrReg} = load ${ptrType}, ${ptrType}* ${objectAddr}`);

        const elemType = this.resolveType(indexExpr.resolvedType!);
        addr = this.newRegister();
        this.emit(
          `  ${addr} = getelementptr inbounds ${elemType}, ${ptrType} ${ptrReg}, i64 ${indexVal}`,
        );
      } else {
        throw new Error("Indexing non-array/non-pointer");
      }

      // Runtime null-object guard for struct locals being indexed (if any)
      if (
        objType.pointerDepth === 0 &&
        indexExpr.object.kind === "Identifier" &&
        !skipNullObjectCheck
      ) {
        const idName = (indexExpr.object as AST.IdentifierExpr).name;
        const flagPtr = this.localNullFlags.get(idName);
        if (flagPtr) {
          const flagVal = this.newRegister();
          this.emit(`  ${flagVal} = load i1, i1* ${flagPtr}`);

          // Negate the flag: if it's 0 (null), we want to trap
          const negFlag = this.newRegister();
          this.emit(`  ${negFlag} = xor i1 ${flagVal}, 1`);

          const funcName = this.currentFunctionName || "unknown";
          const exprStr = `${idName}[...]`;
          const msg = "Attempted to access index of null object";

          // Create string literals for the error struct fields
          if (!this.stringLiterals.has(msg)) {
            this.stringLiterals.set(
              msg,
              `@.null_err_msg.${this.stringLiterals.size}`,
            );
          }
          if (!this.stringLiterals.has(funcName)) {
            this.stringLiterals.set(
              funcName,
              `@.null_err_func.${this.stringLiterals.size}`,
            );
          }
          if (!this.stringLiterals.has(exprStr)) {
            this.stringLiterals.set(
              exprStr,
              `@.null_err_expr.${this.stringLiterals.size}`,
            );
          }

          const throwLabel = this.newLabel("nullobj.throw");
          const passLabel = this.newLabel("nullobj.pass");
          this.emit(
            `  br i1 ${negFlag}, label %${throwLabel}, label %${passLabel}`,
          );

          // Throw NullAccessError
          this.emit(`${throwLabel}:`);
          const errorStruct = this.newRegister();
          const errorWithMsg = this.newRegister();
          const errorWithFunc = this.newRegister();
          const errorWithExpr = this.newRegister();
          const msgLen = msg.length + 1;
          const funcLen = funcName.length + 1;
          const exprLen = exprStr.length + 1;
          this.emit(
            `  ${errorStruct} = insertvalue %struct.NullAccessError undef, i8* getelementptr inbounds ([${msgLen} x i8], [${msgLen} x i8]* ${this.stringLiterals.get(
              msg,
            )}, i64 0, i64 0), 0`,
          );
          this.emit(
            `  ${errorWithMsg} = insertvalue %struct.NullAccessError ${errorStruct}, i8* getelementptr inbounds ([${funcLen} x i8], [${funcLen} x i8]* ${this.stringLiterals.get(
              funcName,
            )}, i64 0, i64 0), 1`,
          );
          this.emit(
            `  ${errorWithExpr} = insertvalue %struct.NullAccessError ${errorWithMsg}, i8* getelementptr inbounds ([${exprLen} x i8], [${exprLen} x i8]* ${this.stringLiterals.get(
              exprStr,
            )}, i64 0, i64 0), 2`,
          );
          this.emitThrow(errorWithExpr, "%struct.NullAccessError");

          // Continue normal path
          this.emit(`${passLabel}:`);
        }
      }

      return addr;
    } else if (expr.kind === "Call") {
      if (expr.resolvedType) {
        const llvmType = this.resolveType(expr.resolvedType);
        if (llvmType.endsWith("*")) {
          // Calls returning pointers can be used directly as addresses.
          return this.generateExpression(expr);
        }
      }
      throw new Error("Expression is not an lvalue: Call");
    } else if (expr.kind === "Unary") {
      const unaryExpr = expr as AST.UnaryExpr;
      if (unaryExpr.operator.type === TokenType.Star) {
        // Dereference: *x
        // The address is the value of x
        return this.generateExpression(unaryExpr.operand);
      }
      throw new Error("Address of non-lvalue unary expression");
    }

    throw new Error(`Expression is not an lvalue: ${expr.kind}`);
  }

  private generateGlobalVariable(decl: AST.VariableDecl) {
    if (typeof decl.name !== "string") {
      throw new Error("Destructuring not supported for global variables");
    }
    this.globals.add(decl.name);

    const type = this.resolveType(decl.typeAnnotation!);
    let init = "zeroinitializer";
    if (decl.initializer) {
      if (decl.initializer.kind === "Literal") {
        init = this.generateLiteral(decl.initializer as AST.LiteralExpr);
      } else {
        throw new Error("Global variables must be initialized with literals");
      }
    } else {
      if (
        type === "i64" ||
        type === "i32" ||
        type === "i16" ||
        type === "i8" ||
        type === "i1"
      )
        init = "0";
      else if (type === "double") init = "0.0";
      else if (type.endsWith("*")) init = "null";
    }
    this.emitDeclaration(`@${decl.name} = global ${type} ${init}`);
    this.emitDeclaration("");
  }

  private generateSwitch(stmt: AST.SwitchStmt) {
    const cond = this.generateExpression(stmt.expression);
    const endLabel = this.newLabel("switch.end");
    const defaultLabel = stmt.defaultCase
      ? this.newLabel("switch.default")
      : endLabel;

    const caseLabels: { value: string; label: string; body: AST.BlockStmt }[] =
      [];
    for (const caseStmt of stmt.cases) {
      if (caseStmt.value.kind !== "Literal") {
        throw new Error("Switch case values must be literals");
      }
      const val = this.generateLiteral(caseStmt.value as AST.LiteralExpr);
      const label = this.newLabel("switch.case");
      caseLabels.push({ value: val, label, body: caseStmt.body });
    }

    const condType = this.resolveType(stmt.expression.resolvedType!);

    this.emit(`  switch ${condType} ${cond}, label %${defaultLabel} [`);
    for (const c of caseLabels) {
      this.emit(`    ${condType} ${c.value}, label %${c.label}`);
    }
    this.emit(`  ]`);

    for (const c of caseLabels) {
      this.emit(`${c.label}:`);
      this.generateBlock(c.body);
      if (!this.isTerminator(this.output[this.output.length - 1] || "")) {
        this.emit(`  br label %${endLabel}`);
      }
    }

    if (stmt.defaultCase) {
      this.emit(`${defaultLabel}:`);
      this.generateBlock(stmt.defaultCase);
      if (!this.isTerminator(this.output[this.output.length - 1] || "")) {
        this.emit(`  br label %${endLabel}`);
      }
    }

    this.emit(`${endLabel}:`);
  }

  private emitCast(
    val: string,
    srcType: string,
    destType: string,
    srcTypeNode: AST.TypeNode,
    destTypeNode: AST.TypeNode,
  ): string {
    const reg = this.newRegister();

    if (srcType === destType) return val;

    // Special: casting literal null to a struct/object value should become zeroinitializer
    // Detect by value literal and destination being a non-pointer struct type
    if (
      val === "null" &&
      destType.startsWith("%struct.") &&
      !destType.endsWith("*")
    ) {
      return "zeroinitializer";
    }

    // Implicit address-of (T -> *T)
    if (destType === srcType + "*") {
      const ptr = this.newRegister();
      this.emit(`  ${ptr} = alloca ${srcType}`);
      this.emit(`  store ${srcType} ${val}, ${srcType}* ${ptr}`);
      return ptr;
    }

    // Implicit dereference (*T -> T) - copy
    if (srcType === destType + "*") {
      const reg = this.newRegister();
      this.emit(`  ${reg} = load ${destType}, ${srcType} ${val}`);
      return reg;
    }

    // Void pointer compatibility: i8* (void*) <-> any pointer type
    // Allow bidirectional casting between void* and any other pointer
    if (srcType === "i8*" && destType.endsWith("*")) {
      this.emit(`  ${reg} = bitcast ${srcType} ${val} to ${destType}`);
      return reg;
    }
    if (srcType.endsWith("*") && destType === "i8*") {
      this.emit(`  ${reg} = bitcast ${srcType} ${val} to ${destType}`);
      return reg;
    }

    // Pointer casts
    if (srcType.endsWith("*") && destType.endsWith("*")) {
      this.emit(`  ${reg} = bitcast ${srcType} ${val} to ${destType}`);
      return reg;
    }
    if (srcType.startsWith("i") && destType.endsWith("*")) {
      this.emit(`  ${reg} = inttoptr ${srcType} ${val} to ${destType}`);
      return reg;
    }
    if (srcType.endsWith("*") && destType.startsWith("i")) {
      this.emit(`  ${reg} = ptrtoint ${srcType} ${val} to ${destType}`);
      return reg;
    }

    // Float casts
    if (srcType === "double" && destType.startsWith("i")) {
      const op = this.isSigned(destTypeNode) ? "fptosi" : "fptoui";
      this.emit(`  ${reg} = ${op} double ${val} to ${destType}`);
      return reg;
    }
    if (srcType.startsWith("i") && destType === "double") {
      const op = this.isSigned(srcTypeNode) ? "sitofp" : "uitofp";
      this.emit(`  ${reg} = ${op} ${srcType} ${val} to double`);
      return reg;
    }

    // Integer casts
    if (srcType.startsWith("i") && destType.startsWith("i")) {
      const srcWidth = this.getBitWidth(srcType);
      const destWidth = this.getBitWidth(destType);

      if (srcWidth > destWidth) {
        this.emit(`  ${reg} = trunc ${srcType} ${val} to ${destType}`);
        return reg;
      } else if (srcWidth < destWidth) {
        // For implicit conversions (like literal to variable), we might not have explicit cast.
        // But here we are generating code.
        // If we are extending, we need to know if source is signed.
        // If source is a literal (e.g. -10), it might be typed as 'int' (i32) but we want to assign to 'i8'.
        // Wait, if we assign -10 (i32) to i8, that's truncation, not extension.
        // If we assign 10 (i32) to i64, that's extension.

        const op = this.isSigned(srcTypeNode) ? "sext" : "zext";
        this.emit(`  ${reg} = ${op} ${srcType} ${val} to ${destType}`);
        return reg;
      } else {
        return val;
      }
    }

    throw new Error(`Unsupported cast from ${srcType} to ${destType}`);
  }

  private generateLogicalAnd(expr: AST.BinaryExpr): string {
    const leftVal = this.generateExpression(expr.left);
    const resPtr = this.allocateStack(`and_res_${this.labelCount++}`, "i1");
    const falseLabel = this.newLabel("and.false");
    const trueLabel = this.newLabel("and.true");
    const endLabel = this.newLabel("and.end");

    this.emit(`  br i1 ${leftVal}, label %${trueLabel}, label %${falseLabel}`);

    this.emit(`${falseLabel}:`);
    this.emit(`  store i1 0, i1* ${resPtr}`);
    this.emit(`  br label %${endLabel}`);

    this.emit(`${trueLabel}:`);
    const rightVal = this.generateExpression(expr.right);
    this.emit(`  store i1 ${rightVal}, i1* ${resPtr}`);
    this.emit(`  br label %${endLabel}`);

    this.emit(`${endLabel}:`);
    const reg = this.newRegister();
    this.emit(`  ${reg} = load i1, i1* ${resPtr}`);
    return reg;
  }

  private generateLogicalOr(expr: AST.BinaryExpr): string {
    const leftVal = this.generateExpression(expr.left);

    const resPtr = this.allocateStack(`or_res_${this.labelCount++}`, "i1");

    const trueLabel = this.newLabel("or.true");

    const evalRhsLabel = this.newLabel("or.eval_rhs");

    const endLabel = this.newLabel("or.end");

    this.emit(
      `  br i1 ${leftVal}, label %${trueLabel}, label %${evalRhsLabel}`,
    );

    this.emit(`${trueLabel}:`);

    this.emit(`  store i1 1, i1* ${resPtr}`);

    this.emit(`  br label %${endLabel}`);

    this.emit(`${evalRhsLabel}:`);

    const rightVal = this.generateExpression(expr.right);

    this.emit(`  store i1 ${rightVal}, i1* ${resPtr}`);

    this.emit(`  br label %${endLabel}`);

    this.emit(`${endLabel}:`);

    const reg = this.newRegister();

    this.emit(`  ${reg} = load i1, i1* ${resPtr}`);

    return reg;
  }

  private findInstantiatedParentType(
    childDecl: AST.StructDecl,
    childType: AST.BasicTypeNode,
    parentName: string,
  ): AST.BasicTypeNode | undefined {
    if (childDecl.name === parentName) return childType;

    if (!childDecl.inheritanceList || childDecl.inheritanceList.length === 0)
      return undefined;

    const parentType = childDecl.inheritanceList[0] as AST.BasicTypeNode;

    // Substitute if child is generic
    let instantiatedParent = parentType;
    if (
      childDecl.genericParams.length > 0 &&
      childType.genericArgs.length > 0
    ) {
      const map = new Map<string, AST.TypeNode>();
      for (let i = 0; i < childDecl.genericParams.length; i++) {
        if (i < childType.genericArgs.length) {
          map.set(childDecl.genericParams[i]!.name, childType.genericArgs[i]!);
        }
      }
      instantiatedParent = this.substituteType(
        parentType,
        map,
      ) as AST.BasicTypeNode;
    }

    if (instantiatedParent.name === parentName) return instantiatedParent;

    const parentDecl = this.structMap.get(instantiatedParent.name);
    if (!parentDecl) return undefined;

    return this.findInstantiatedParentType(
      parentDecl,
      instantiatedParent,
      parentName,
    );
  }

  private generateSizeof(expr: AST.SizeofExpr): string {
    let type: AST.TypeNode;
    if ("kind" in expr.target && (expr.target.kind as string) !== "BasicType") {
      type = (expr.target as AST.Expression).resolvedType!;
    } else {
      type = expr.target as AST.TypeNode;
    }

    if (type.kind === "MetaType") {
      type = (type as any).type;
    }

    const llvmType = this.resolveType(type);
    const ptrReg = this.newRegister();
    this.emit(
      `  ${ptrReg} = getelementptr ${llvmType}, ${llvmType}* null, i32 1`,
    );
    const intReg = this.newRegister();
    this.emit(`  ${intReg} = ptrtoint ${llvmType}* ${ptrReg} to i64`);
    return intReg;
  }

  private resolveTypeDepth = 0;

  private resolveType(type: AST.TypeNode): string {
    if (this.resolveTypeDepth > 200) {
      console.log(`resolveType recursion limit reached! Type: ${type.kind}`);
      if (type.kind === "BasicType") console.log(`Name: ${(type as any).name}`);
      throw new Error("resolveType recursion limit");
    }
    this.resolveTypeDepth++;
    try {
      if (!type) {
        // Should not happen if TypeChecker did its job
        throw new Error("Cannot resolve undefined type");
      }
      if (type.kind === "BasicType") {
        const basicType = type as AST.BasicTypeNode;
        let llvmType = "";

        // Check currentTypeMap for generic substitutions
        if (this.currentTypeMap.has(basicType.name)) {
          const mapped = this.currentTypeMap.get(basicType.name)!;

          // Prevent infinite recursion if mapped type is same as current type (T -> T)
          if (
            mapped.kind === "BasicType" &&
            (mapped as any).name === basicType.name
          ) {
            // Fallback to struct name if T maps to T (generic template context)
            return `%struct.${basicType.name}`;
          }

          let llvmType = this.resolveType(mapped);

          for (let i = 0; i < basicType.pointerDepth; i++) {
            llvmType += "*";
          }

          for (let i = basicType.arrayDimensions.length - 1; i >= 0; i--) {
            llvmType = `[${basicType.arrayDimensions[i]} x ${llvmType}]`;
          }
          return llvmType;
        }

        // Check for type aliases
        if (this.typeAliasMap.has(basicType.name)) {
          const aliasDecl = this.typeAliasMap.get(basicType.name)!;
          // If it's a generic alias, we need to substitute args
          if (aliasDecl.genericParams && aliasDecl.genericParams.length > 0) {
            // For now, just resolve the base type if no args provided (should be handled by TypeChecker)
            // If args provided, we need substitution logic similar to structs
            if (basicType.genericArgs.length > 0) {
              const typeMap = new Map<string, AST.TypeNode>();
              for (let i = 0; i < aliasDecl.genericParams.length; i++) {
                typeMap.set(
                  aliasDecl.genericParams[i]!.name,
                  basicType.genericArgs[i]!,
                );
              }
              const substituted = this.substituteType(aliasDecl.type, typeMap);
              let llvmType = this.resolveType(substituted);

              for (let i = 0; i < basicType.pointerDepth; i++) {
                llvmType += "*";
              }
              for (let i = basicType.arrayDimensions.length - 1; i >= 0; i--) {
                llvmType = `[${basicType.arrayDimensions[i]} x ${llvmType}]`;
              }
              return llvmType;
            }
          }

          // Non-generic alias or generic alias used without args (if allowed/resolved)
          let llvmType = this.resolveType(aliasDecl.type);
          for (let i = 0; i < basicType.pointerDepth; i++) {
            llvmType += "*";
          }
          for (let i = basicType.arrayDimensions.length - 1; i >= 0; i--) {
            llvmType = `[${basicType.arrayDimensions[i]} x ${llvmType}]`;
          }
          return llvmType;
        }

        // Check for generics usage
        if (basicType.genericArgs && basicType.genericArgs.length > 0) {
          // Substitute generic args first
          const instantiatedArgs = basicType.genericArgs.map((arg) =>
            this.substituteType(arg, this.currentTypeMap),
          );
          const structDecl = this.structMap.get(basicType.name);
          const enumDecl = this.enumDeclMap.get(basicType.name);

          if (structDecl) {
            // Instantiate generic struct
            llvmType = this.resolveMonomorphizedType(
              structDecl,
              instantiatedArgs,
            );
          } else if (enumDecl) {
            // Instantiate generic enum
            const mangledName = this.instantiateGenericEnum(
              basicType.name,
              instantiatedArgs,
            );
            llvmType = `%enum.${mangledName}`;
          } else {
            // Maybe a primitive like int<T>? Should not happen.
            llvmType = `%struct.${basicType.name}`; // Fallback
          }
        } else {
          switch (basicType.name) {
            case "int":
            case "i32":
            case "u32":
            case "uint":
              llvmType = "i32";
              break;
            case "i8":
            case "u8":
            case "char":
            case "uchar":
              llvmType = "i8";
              break;
            case "i16":
            case "u16":
            case "short":
            case "ushort":
              llvmType = "i16";
              break;
            case "i64":
            case "u64":
            case "long":
            case "ulong":
              llvmType = "i64";
              break;
            case "float":
            case "double":
              llvmType = "double";
              break;
            case "bool":
            case "i1":
              llvmType = "i1";
              break;
            case "void":
              llvmType = basicType.pointerDepth > 0 ? "i8" : "void";
              break;
            case "string":
              llvmType = "i8*";
              break;
            case "null":
            case "nullptr":
              llvmType = "i8*"; // Generic pointer type
              break;
            default:
              // Check if it's an enum type
              if (this.enumVariants.has(basicType.name)) {
                llvmType = `%enum.${basicType.name}`;
              } else {
                llvmType = `%struct.${basicType.name}`;
              }
              break;
          }
        }

        for (let i = 0; i < basicType.pointerDepth; i++) {
          llvmType += "*";
        }

        for (let i = basicType.arrayDimensions.length - 1; i >= 0; i--) {
          llvmType = `[${basicType.arrayDimensions[i]} x ${llvmType}]`;
        }

        return llvmType;
      } else if (type.kind === "TupleType") {
        const tupleType = type as AST.TupleTypeNode;
        // Represent tuples as LLVM structs: { type0, type1, ... }
        const elementTypes = tupleType.types.map((t) => this.resolveType(t));
        return `{ ${elementTypes.join(", ")} }`;
      } else if (type.kind === "FunctionType") {
        const funcType = type as AST.FunctionTypeNode;
        const ret = this.resolveType(funcType.returnType);
        const params = funcType.paramTypes
          .map((p) => this.resolveType(p))
          .join(", ");
        return `${ret} (${params})*`;
      }
      return "void";
    } finally {
      this.resolveTypeDepth--;
    }
  }

  private newRegister(): string {
    return `%${this.registerCount++}`;
  }

  private newLabel(name: string): string {
    return `${name}.${this.labelCount++}`;
  }

  private expressionToString(expr: AST.Expression): string {
    if (expr.kind === "Identifier") {
      return (expr as AST.IdentifierExpr).name;
    } else if (expr.kind === "Index") {
      const indexExpr = expr as AST.IndexExpr;
      return `${this.expressionToString(indexExpr.object)}[${this.expressionToString(
        indexExpr.index,
      )}]`;
    } else if (expr.kind === "Member") {
      const memberExpr = expr as AST.MemberExpr;
      return `${this.expressionToString(memberExpr.object)}.${memberExpr.property}`;
    } else if (expr.kind === "Literal") {
      const lit = expr as AST.LiteralExpr;
      return String(lit.value);
    } else {
      return "<expr>";
    }
  }

  private isTerminator(line: string): boolean {
    line = line.trim();
    return (
      line.startsWith("ret ") ||
      line.startsWith("br ") ||
      line.startsWith("switch ") ||
      line.startsWith("unreachable")
    );
  }

  private emitNullObjectTrap(
    trapLabel: string,
    funcName: string,
    accessExpr: string,
  ): void {
    this.emit(`${trapLabel}:`);
    // Print error message to stderr using fprintf
    const msg = `\n*** NULL OBJECT ACCESS ***\nFunction: ${funcName}\nExpression: ${accessExpr}\nAttempted to access member/index of null object\n\n`;
    if (!this.stringLiterals.has(msg)) {
      this.stringLiterals.set(
        msg,
        `@.null_err_msg.${this.stringLiterals.size}`,
      );
    }
    const msgVar = this.stringLiterals.get(msg)!;
    const msgLen = msg.length + 1;

    // Load stderr (file descriptor 2) and print using fprintf
    // We use write syscall to avoid register issues with fprintf return value
    const stderrPtr = this.newRegister();
    this.emit(
      `  ${stderrPtr} = load %struct._IO_FILE*, %struct._IO_FILE** @stderr`,
    );
    this.emit(
      `  call i32 @fprintf(%struct._IO_FILE* ${stderrPtr}, i8* getelementptr inbounds ([${msgLen} x i8], [${msgLen} x i8]* ${msgVar}, i64 0, i64 0))`,
    );
    this.emit(`  call void @exit(i32 1)`);
    this.emit(`  unreachable`);
  }

  private allocateStack(name: string, type: string): string {
    // Use stack alloc count to ensure uniqueness, even if same variable name is used in different scopes
    const ptr = `%${name}_ptr.${this.stackAllocCount++}`;
    this.emit(`  ${ptr} = alloca ${type}`);
    this.locals.add(name);
    this.localPointers.set(name, ptr);

    // If this is a struct value (non-pointer), allocate a null-flag alongside it
    // Default to 1 (valid) - we'll set it to 0 only when null is explicitly assigned
    if (type.startsWith("%struct.") && !type.endsWith("*")) {
      const flagPtr = `%${name}_null.${this.stackAllocCount++}`;
      this.emit(`  ${flagPtr} = alloca i1`);
      this.emit(`  store i1 1, i1* ${flagPtr}`); // Default to 1 (valid/not null)
      this.localNullFlags.set(name, flagPtr);
    }
    return ptr;
  }

  private generateAssignment(expr: AST.AssignmentExpr): string {
    // Check for index assignment with __set__ operator overload
    if (expr.assignee.kind === "Index") {
      const indexExpr = expr.assignee as AST.IndexExpr;
      // Check if there's a __set__ operator overload
      // We need to find the __set__ method in the TypeChecker annotations
      // For now, look up the method from the object's type
      if (
        indexExpr.object.resolvedType &&
        indexExpr.object.resolvedType.kind === "BasicType"
      ) {
        const objectType = indexExpr.object.resolvedType as AST.BasicTypeNode;
        const structDecl = this.structMap.get(objectType.name);

        if (structDecl) {
          // Look for __set__ method in struct members
          const setMethod = structDecl.members.find(
            (m): m is AST.FunctionDecl =>
              m.kind === "FunctionDecl" && m.name === "__set__",
          );
          if (setMethod && expr.operator.type === TokenType.Equal) {
            // Generate __set__ call: object.__set__(index, value)
            const objectRaw = this.generateExpression(indexExpr.object);
            const indexRaw = this.generateExpression(indexExpr.index);
            const valueRaw = this.generateExpression(expr.value);

            // Get the struct name and build full method name
            const structName = objectType.name;
            const methodType = setMethod.resolvedType as AST.FunctionTypeNode;
            const fullMethodName = `${structName}_${setMethod.name}`;
            const mangledName = this.getMangledName(fullMethodName, methodType);

            // Get address of object (this pointer)
            const objectTypeStr = this.resolveType(objectType);
            const indexType = this.resolveType(indexExpr.index.resolvedType!);
            const valueType = this.resolveType(expr.value.resolvedType!);

            let thisPtr: string;
            try {
              thisPtr = this.generateAddress(indexExpr.object);
            } catch {
              // If we can't get address, spill to stack
              const spillAddr = this.allocateStack(
                `op_spill_${this.labelCount++}`,
                objectTypeStr,
              );
              this.emit(
                `  store ${objectTypeStr} ${objectRaw}, ${objectTypeStr}* ${spillAddr}`,
              );
              thisPtr = spillAddr;
            }

            // Call __set__ method: returns void typically
            const returnType = this.resolveType(setMethod.returnType);
            if (returnType !== "void") {
              const resultReg = this.newRegister();
              this.emit(
                `  ${resultReg} = call ${returnType} @${mangledName}(${objectTypeStr}* ${thisPtr}, ${indexType} ${indexRaw}, ${valueType} ${valueRaw})`,
              );
              return resultReg;
            } else {
              this.emit(
                `  call void @${mangledName}(${objectTypeStr}* ${thisPtr}, ${indexType} ${indexRaw}, ${valueType} ${valueRaw})`,
              );
              return valueRaw; // Return the assigned value
            }
          }
        }
      }
    }

    // Handle tuple destructuring assignment: (a, b) = expr
    if (expr.assignee.kind === "TupleLiteral") {
      const tupleLit = expr.assignee as AST.TupleLiteralExpr;
      const tupleVal = this.generateExpression(expr.value);
      const tupleType = this.resolveType(expr.value.resolvedType!);

      // Extract each element and assign to the corresponding target
      for (let i = 0; i < tupleLit.elements.length; i++) {
        const target = tupleLit.elements[i]!;
        const addr = this.generateAddress(target, true);

        const elemType = this.resolveType(target.resolvedType!);
        const elemVal = this.newRegister();
        this.emit(`  ${elemVal} = extractvalue ${tupleType} ${tupleVal}, ${i}`);
        this.emit(`  store ${elemType} ${elemVal}, ${elemType}* ${addr}`);
      }

      return tupleVal;
    }

    // Don't skip null check if assignee is a member access through pointer
    const skipCheck =
      expr.assignee.kind === "Member"
        ? false // Always check member access (including pointers)
        : true; // Skip for direct identifiers to avoid double-checking

    const addr = this.generateAddress(expr.assignee, skipCheck);
    const destType = this.resolveType(expr.assignee.resolvedType!);

    if (expr.operator.type === TokenType.Equal) {
      const val = this.generateExpression(expr.value);
      const srcType = this.resolveType(expr.value.resolvedType!);
      const castVal = this.emitCast(
        val,
        srcType,
        destType,
        expr.value.resolvedType!,
        expr.assignee.resolvedType!,
      );
      this.emit(`  store ${destType} ${castVal}, ${destType}* ${addr}`);

      // Update null flag for struct locals
      if (expr.assignee.kind === "Identifier") {
        const id = expr.assignee as AST.IdentifierExpr;
        const flagPtr = this.localNullFlags.get(id.name);
        if (flagPtr) {
          let flagVal = "1"; // Default: struct is not null (valid)

          // If assigning a null literal, set flag to 0
          if (
            expr.value.kind === "Literal" &&
            (expr.value as AST.LiteralExpr).type === "null"
          ) {
            flagVal = "0"; // null means the struct is null
          }
          // If assigning from another struct local with a flag, propagate
          else if (expr.value.kind === "Identifier") {
            const srcId = expr.value as AST.IdentifierExpr;
            const srcFlag = this.localNullFlags.get(srcId.name);
            if (srcFlag) {
              const loaded = this.newRegister();
              this.emit(`  ${loaded} = load i1, i1* ${srcFlag}`);
              flagVal = loaded;
            }
          }
          // For all other cases (struct literals, function calls, etc), assume not null (1)
          // Zero values in fields are valid data, not null

          this.emit(`  store i1 ${flagVal}, i1* ${flagPtr}`);
        }

        // Track pointer-to-local in variable declarations: e.g., local y: *X = &x;
        // This allows us to check the null flag when dereferencing the pointer
        if (
          expr.value.kind === "Unary" &&
          (expr.value as AST.UnaryExpr).operator.type === TokenType.Ampersand
        ) {
          const unaryExpr = expr.value as AST.UnaryExpr;
          if (unaryExpr.operand.kind === "Identifier") {
            const sourceLocal = (unaryExpr.operand as AST.IdentifierExpr).name;
            // Track that this pointer points to sourceLocal
            this.pointerToLocal.set(id.name, sourceLocal);
          }
        }
      }
      // Also update __null_bit__ field in struct when assigning to a member/field
      else if (expr.assignee.kind === "Member") {
        const memberExpr = expr.assignee as AST.MemberExpr;
        if (memberExpr.object.kind === "Identifier") {
          const structName = (memberExpr.object as AST.IdentifierExpr).name;
          const flagPtr = this.localNullFlags.get(structName);
          if (flagPtr) {
            // Load current flag value, then update __null_bit__ field in struct
            const objType = memberExpr.object.resolvedType;
            if (objType && objType.kind === "BasicType") {
              const structAddr = this.generateAddress(memberExpr.object, true);
              const llvmType = this.resolveType(objType);
              const structTypeStr = llvmType.startsWith("%struct.")
                ? llvmType
                : `%struct.${llvmType}`;

              // Find __null_bit__ index
              let layout = this.structLayouts.get(
                llvmType.substring(8) || llvmType,
              );
              let structNameForLayout = objType.name;
              if (llvmType.startsWith("%struct.")) {
                structNameForLayout = llvmType.substring(8).replace(/\*+$/, "");
              }
              if (!layout && structNameForLayout.includes(".")) {
                const shortName = structNameForLayout.split(".").pop()!;
                layout = this.structLayouts.get(shortName);
              }
              if (!layout) {
                layout = this.structLayouts.get(structNameForLayout);
              }

              const nullBitIndex = layout ? layout.get("__null_bit__") : -1;
              if (nullBitIndex !== undefined && nullBitIndex >= 0) {
                // Load current struct, insertvalue the __null_bit__ with current flag value, store back
                const flagVal = this.newRegister();
                this.emit(`  ${flagVal} = load i1, i1* ${flagPtr}`);

                const loadedStruct = this.newRegister();
                this.emit(
                  `  ${loadedStruct} = load ${structTypeStr}, ${structTypeStr}* ${structAddr}`,
                );

                const updatedStruct = this.newRegister();
                this.emit(
                  `  ${updatedStruct} = insertvalue ${structTypeStr} ${loadedStruct}, i1 ${flagVal}, ${nullBitIndex}`,
                );

                this.emit(
                  `  store ${structTypeStr} ${updatedStruct}, ${structTypeStr}* ${structAddr}`,
                );
              }
            }
          }
        }
      }
      return castVal;
    }

    // Compound assignment
    const currentValue = this.newRegister();
    this.emit(`  ${currentValue} = load ${destType}, ${destType}* ${addr}`);

    const val = this.generateExpression(expr.value);
    const srcType = this.resolveType(expr.value.resolvedType!);
    const castVal = this.emitCast(
      val,
      srcType,
      destType,
      expr.value.resolvedType!,
      expr.assignee.resolvedType!,
    );

    const isFloat = destType === "double";
    let op = "";
    switch (expr.operator.type) {
      case TokenType.PlusEqual:
        op = isFloat ? "fadd" : "add";
        break;
      case TokenType.MinusEqual:
        op = isFloat ? "fsub" : "sub";
        break;
      case TokenType.StarEqual:
        op = isFloat ? "fmul" : "mul";
        break;
      case TokenType.SlashEqual:
        op = isFloat ? "fdiv" : "sdiv";
        break;
      case TokenType.PercentEqual:
        op = isFloat ? "frem" : "srem";
        break;
      // Bitwise operators can be added here
    }

    if (!op) {
      throw new Error(
        `Unsupported compound assignment operator: ${expr.operator.lexeme}`,
      );
    }

    const result = this.newRegister();
    this.emit(`  ${result} = ${op} ${destType} ${currentValue}, ${castVal}`);
    this.emit(`  store ${destType} ${result}, ${destType}* ${addr}`);

    return result;
  }

  private generateMember(expr: AST.MemberExpr): string {
    // Handle enum variant construction (e.g., Color.Red or Option<int>.Some)
    const enumVariantInfo = (expr as any).enumVariantInfo;
    if (enumVariantInfo) {
      return this.generateEnumVariantConstruction(
        enumVariantInfo.enumDecl,
        enumVariantInfo.variant,
        enumVariantInfo.variantIndex,
        enumVariantInfo.genericArgs, // Pass generic args if present
      );
    }

    if (expr.object.kind === "Call") {
      const callType = expr.object.resolvedType as
        | AST.BasicTypeNode
        | undefined;
      if (!callType || callType.kind !== "BasicType") {
        throw new Error("Member access on non-struct type");
      }

      // When a call returns a value (non-pointer), materialize a temporary so reads work.
      // For pointer returns, we can treat the call result as the base pointer directly.
      const isPointerReturn = callType.pointerDepth > 0;
      const llvmObjType = this.resolveType(callType);
      let basePtr: string;

      if (isPointerReturn) {
        basePtr = this.generateExpression(expr.object);
      } else {
        // Allocate space, store the value, and use it as the struct base.
        basePtr = this.newRegister();
        this.emit(`  ${basePtr} = alloca ${llvmObjType}`);
        const valueReg = this.generateExpression(expr.object);
        this.emit(
          `  store ${llvmObjType} ${valueReg}, ${llvmObjType}* ${basePtr}`,
        );
      }

      // Determine struct layout
      let structName = callType.name;
      if (llvmObjType.startsWith("%struct.")) {
        structName = llvmObjType.substring(8);
        while (structName.endsWith("*")) structName = structName.slice(0, -1);
      }

      let layout = this.structLayouts.get(structName);
      if (!layout && structName.includes(".")) {
        const shortName = structName.split(".").pop()!;
        layout = this.structLayouts.get(shortName);
      }
      if (!layout) {
        throw new Error(`Unknown struct type: ${structName}`);
      }

      const fieldIndex = layout.get(expr.property);
      if (fieldIndex === undefined) {
        throw new Error(
          `Unknown field '${expr.property}' in struct '${structName}'`,
        );
      }

      const addr = this.newRegister();
      const structBase = `%struct.${structName}`;
      this.emit(
        `  ${addr} = getelementptr inbounds ${structBase}, ${structBase}* ${basePtr}, i32 0, i32 ${fieldIndex}`,
      );

      const type = this.resolveType(expr.resolvedType!);
      const reg = this.newRegister();
      this.emit(`  ${reg} = load ${type}, ${type}* ${addr}`);
      return reg;
    }

    const addr = this.generateAddress(expr);
    const type = this.resolveType(expr.resolvedType!);
    const reg = this.newRegister();
    this.emit(`  ${reg} = load ${type}, ${type}* ${addr}`);
    return reg;
  }

  private generateIndex(expr: AST.IndexExpr): string {
    // Check for operator overload (__get__)
    if (expr.operatorOverload) {
      const overload = expr.operatorOverload;
      const method = overload.methodDeclaration;
      const objectRaw = this.generateExpression(expr.object);
      const indexRaw = this.generateExpression(expr.index);

      // Get the struct name from the target type
      const targetType = overload.targetType as AST.BasicTypeNode;
      const structName = targetType.name;

      // Build the method name with struct prefix
      const methodType = method.resolvedType as AST.FunctionTypeNode;
      const fullMethodName = `${structName}_${method.name}`;
      const mangledName = this.getMangledName(fullMethodName, methodType);

      // Prepare arguments: this (object) + index
      const objectType = this.resolveType(expr.object.resolvedType!);
      const indexType = this.resolveType(expr.index.resolvedType!);

      // Get address of object (this pointer)
      let thisPtr: string;
      try {
        thisPtr = this.generateAddress(expr.object);
      } catch {
        // If we can't get address, spill to stack
        const spillAddr = this.allocateStack(
          `op_spill_${this.labelCount++}`,
          objectType,
        );
        this.emit(
          `  store ${objectType} ${objectRaw}, ${objectType}* ${spillAddr}`,
        );
        thisPtr = spillAddr;
      }

      // Call the __get__ method
      const returnType = this.resolveType(method.returnType);
      const resultReg = this.newRegister();
      this.emit(
        `  ${resultReg} = call ${returnType} @${mangledName}(${objectType}* ${thisPtr}, ${indexType} ${indexRaw})`,
      );
      return resultReg;
    }

    const addr = this.generateAddress(expr);
    const type = this.resolveType(expr.resolvedType!);
    const reg = this.newRegister();
    this.emit(`  ${reg} = load ${type}, ${type}* ${addr}`);
    return reg;
  }

  private generateUnary(expr: AST.UnaryExpr): string {
    // Check for operator overload (only for prefix operators)
    if (expr.operatorOverload && expr.isPrefix) {
      const overload = expr.operatorOverload;
      const method = overload.methodDeclaration;
      const operandRaw = this.generateExpression(expr.operand);

      const targetType = overload.targetType as AST.BasicTypeNode;

      // Handle generic struct method calls
      let mangledName: string;
      if (targetType.genericArgs && targetType.genericArgs.length > 0) {
        // Generic struct - need monomorphized method name
        const structDecl = this.structMap.get(targetType.name);
        if (structDecl && structDecl.genericParams.length > 0) {
          // Build context map for generic substitution
          const contextMap = new Map<string, AST.TypeNode>();
          for (let i = 0; i < structDecl.genericParams.length; i++) {
            contextMap.set(
              structDecl.genericParams[i]!.name,
              targetType.genericArgs[i]!,
            );
          }

          // Build monomorphized struct name using mangleType (avoids recursion)
          const argNames = targetType.genericArgs
            .map((arg) => this.mangleType(arg))
            .join("_");
          const structName = `${targetType.name}_${argNames}`;

          // Build method name
          const methodType = method.resolvedType as AST.FunctionTypeNode;
          const fullMethodName = `${structName}_${method.name}`;

          // Get mangled name with substituted types
          const substitutedMethodType = this.substituteType(
            methodType,
            contextMap,
          ) as AST.FunctionTypeNode;

          mangledName = this.getMangledName(
            fullMethodName,
            substitutedMethodType,
          );
        } else {
          // Fallback: non-generic or already concrete
          const structName = targetType.name;
          const methodType = method.resolvedType as AST.FunctionTypeNode;
          const fullMethodName = `${structName}_${method.name}`;
          mangledName = this.getMangledName(fullMethodName, methodType);
        }
      } else {
        // Non-generic struct
        const structName = targetType.name;
        const methodType = method.resolvedType as AST.FunctionTypeNode;
        const fullMethodName = `${structName}_${method.name}`;
        mangledName = this.getMangledName(fullMethodName, methodType);
      }

      // Get address of operand (this pointer)
      const operandType = this.resolveType(expr.operand.resolvedType!);
      let thisPtr: string;
      try {
        thisPtr = this.generateAddress(expr.operand);
      } catch {
        // If we can't get address, spill to stack
        const spillAddr = this.allocateStack(
          `op_spill_${this.labelCount++}`,
          operandType,
        );
        this.emit(
          `  store ${operandType} ${operandRaw}, ${operandType}* ${spillAddr}`,
        );
        thisPtr = spillAddr;
      }

      // Call the operator method
      const returnType = this.resolveType(method.returnType);
      const resultReg = this.newRegister();
      this.emit(
        `  ${resultReg} = call ${returnType} @${mangledName}(${operandType}* ${thisPtr})`,
      );
      return resultReg;
    }

    if (
      expr.operator.type === TokenType.PlusPlus ||
      expr.operator.type === TokenType.MinusMinus
    ) {
      const addr = this.generateAddress(expr.operand);
      const type = this.resolveType(expr.operand.resolvedType!);
      const isFloat = type === "double";
      const one = isFloat ? "1.0" : "1";

      const currentValue = this.newRegister();
      this.emit(`  ${currentValue} = load ${type}, ${type}* ${addr}`);

      let op = "";
      if (expr.operator.type === TokenType.PlusPlus) {
        op = isFloat ? "fadd" : "add";
      } else {
        op = isFloat ? "fsub" : "sub";
      }

      const newValue = this.newRegister();
      this.emit(`  ${newValue} = ${op} ${type} ${currentValue}, ${one}`);
      this.emit(`  store ${type} ${newValue}, ${type}* ${addr}`);

      return expr.isPrefix ? newValue : currentValue;
    }

    if (expr.operator.type === TokenType.Ampersand) {
      return this.generateAddress(expr.operand);
    } else if (expr.operator.type === TokenType.Star) {
      const ptr = this.generateExpression(expr.operand);
      const type = this.resolveType(expr.resolvedType!);
      const reg = this.newRegister();
      this.emit(`  ${reg} = load ${type}, ${type}* ${ptr}`);
      return reg;
    } else if (expr.operator.type === TokenType.Minus) {
      const val = this.generateExpression(expr.operand);
      const type = this.resolveType(expr.resolvedType!);
      const reg = this.newRegister();
      if (type === "double") {
        this.emit(`  ${reg} = fsub double 0.0, ${val}`);
      } else {
        this.emit(`  ${reg} = sub ${type} 0, ${val}`);
      }
      return reg;
    } else if (expr.operator.type === TokenType.Bang) {
      const val = this.generateExpression(expr.operand);
      const reg = this.newRegister();
      this.emit(`  ${reg} = xor i1 ${val}, true`);
      return reg;
    } else if (expr.operator.type === TokenType.Tilde) {
      const val = this.generateExpression(expr.operand);
      const type = this.resolveType(expr.resolvedType!);
      const reg = this.newRegister();
      this.emit(`  ${reg} = xor ${type} ${val}, -1`);
      return reg;
    }
    return "0";
  }

  private generateCast(expr: AST.CastExpr): string {
    const val = this.generateExpression(expr.expression);
    const srcType = this.resolveType(expr.expression.resolvedType!);
    const destType = this.resolveType(expr.targetType);
    return this.emitCast(
      val,
      srcType,
      destType,
      expr.expression.resolvedType!,
      expr.targetType,
    );
  }

  private generateArrayLiteral(expr: AST.ArrayLiteralExpr): string {
    const type = this.resolveType(expr.resolvedType!);
    let arrayVal = "undef";

    for (let i = 0; i < expr.elements.length; i++) {
      const elemExpr = expr.elements[i]!;
      const elemVal = this.generateExpression(elemExpr);
      const elemType = this.resolveType(elemExpr.resolvedType!);
      const nextVal = this.newRegister();
      this.emit(
        `  ${nextVal} = insertvalue ${type} ${arrayVal}, ${elemType} ${elemVal}, ${i}`,
      );
      arrayVal = nextVal;
    }

    return arrayVal;
  }

  private generateStructLiteral(expr: AST.StructLiteralExpr): string {
    const type = this.resolveType(expr.resolvedType!);
    let structVal = "undef";

    const basicType = expr.resolvedType as AST.BasicTypeNode;
    // Handle monomorphized names
    let structName = basicType.name;
    if (basicType.genericArgs.length > 0) {
      // We need the mangled name without parameters to look up layout
      const resolved = this.resolveType(basicType);
      // resolved is %struct.Box_i32
      if (resolved.startsWith("%struct.")) {
        structName = resolved.substring(8);
      }
    }

    // Try to find layout
    let layout = this.structLayouts.get(structName);
    if (!layout) {
      // Maybe we haven't generated the layout yet?
      // generateStructLiteral should happen inside a function, so types should be resolved.
      throw new Error(`Layout for struct ${structName} not found`);
    }

    const fieldValues = new Map<string, AST.Expression>();
    for (const field of expr.fields) {
      fieldValues.set(field.name, field.value);
    }

    const sortedFields = Array.from(layout.entries()).sort(
      (a, b) => a[1] - b[1],
    );

    for (const [fieldName, fieldIndex] of sortedFields) {
      const valExpr = fieldValues.get(fieldName);
      if (valExpr) {
        const val = this.generateExpression(valExpr);
        const fieldType = this.resolveType(valExpr.resolvedType!);
        const nextVal = this.newRegister();
        this.emit(
          `  ${nextVal} = insertvalue ${type} ${structVal}, ${fieldType} ${val}, ${fieldIndex}`,
        );
        structVal = nextVal;
      }
    }

    // Set __null_bit__ to 1 (struct is valid, not null)
    const nullBitIndex = layout.get("__null_bit__");
    if (nullBitIndex !== undefined) {
      const nextVal = this.newRegister();
      this.emit(
        `  ${nextVal} = insertvalue ${type} ${structVal}, i1 1, ${nullBitIndex}`,
      );
      structVal = nextVal;
    }

    return structVal;
  }

  private generateTupleLiteral(expr: AST.TupleLiteralExpr): string {
    const type = this.resolveType(expr.resolvedType!);
    let tupleVal = "undef";

    // Generate each element and insert into the tuple struct
    for (let i = 0; i < expr.elements.length; i++) {
      const elemExpr = expr.elements[i]!;
      const elemVal = this.generateExpression(elemExpr);
      const elemType = this.resolveType(elemExpr.resolvedType!);
      const nextVal = this.newRegister();
      this.emit(
        `  ${nextVal} = insertvalue ${type} ${tupleVal}, ${elemType} ${elemVal}, ${i}`,
      );
      tupleVal = nextVal;
    }

    return tupleVal;
  }

  private generateEnumStructVariant(expr: AST.EnumStructVariantExpr): string {
    // Get the enum variant info from type checker
    const enumVariantInfo = (expr as any).enumVariantInfo;
    if (!enumVariantInfo) {
      throw new Error(
        "Missing enum variant info for struct variant construction",
      );
    }

    const enumDecl = enumVariantInfo.enumDecl as AST.EnumDecl;
    const variant = enumVariantInfo.variant as AST.EnumVariant;
    const variantIndex = enumVariantInfo.variantIndex as number;

    // Generate code to construct the enum value
    const enumType = this.resolveType(expr.resolvedType!);

    // Allocate space on stack to build the enum value
    const enumPtr = this.newRegister();
    this.emit(`  ${enumPtr} = alloca ${enumType}`);

    // Get pointer to tag field and store the discriminant
    const tagPtr = this.newRegister();
    this.emit(
      `  ${tagPtr} = getelementptr inbounds ${enumType}, ${enumType}* ${enumPtr}, i32 0, i32 0`,
    );
    this.emit(`  store i32 ${variantIndex}, i32* ${tagPtr}`);

    // Handle struct data if present
    if (
      variant.dataType &&
      variant.dataType.kind === "EnumVariantStruct" &&
      expr.fields.length > 0
    ) {
      // Get pointer to data field
      const dataPtr = this.newRegister();
      this.emit(
        `  ${dataPtr} = getelementptr inbounds ${enumType}, ${enumType}* ${enumPtr}, i32 0, i32 1`,
      );

      const structVariant = variant.dataType as AST.EnumVariantStruct;

      // Store each field in sequence in the data array
      for (let i = 0; i < expr.fields.length; i++) {
        const field = expr.fields[i]!;
        const fieldValue = this.generateExpression(field.value);
        const fieldType = this.resolveType(field.value.resolvedType!);

        // Find the field index in the variant definition
        const fieldIndex = structVariant.fields.findIndex(
          (f) => f.name === field.name,
        );
        if (fieldIndex === -1) {
          throw new Error(
            `Field ${field.name} not found in variant ${variant.name}`,
          );
        }

        // Cast data pointer to the field type
        const typedPtr = this.newRegister();
        this.emit(
          `  ${typedPtr} = bitcast [${this.getTypeSize(
            fieldType,
          )} x i8]* ${dataPtr} to ${fieldType}*`,
        );

        // If there are multiple fields, we need to offset the pointer
        let storePtr = typedPtr;
        if (fieldIndex > 0) {
          storePtr = this.newRegister();
          this.emit(
            `  ${storePtr} = getelementptr ${fieldType}, ${fieldType}* ${typedPtr}, i32 ${fieldIndex}`,
          );
        }

        // Store the value
        this.emit(
          `  store ${fieldType} ${fieldValue}, ${fieldType}* ${storePtr}`,
        );
      }
    }

    // Load the constructed enum value
    const result = this.newRegister();
    this.emit(`  ${result} = load ${enumType}, ${enumType}* ${enumPtr}`);

    return result;
  }

  private escapeString(str: string): string {
    return str
      .replace(/\\/g, "\\5C")
      .replace(/"/g, "\\22")
      .replace(/\n/g, "\\0A")
      .replace(/\t/g, "\\09")
      .replace(/\r/g, "\\0D");
  }

  private getBitWidth(type: string): number {
    if (type === "i1") return 1;
    if (type === "i8") return 8;
    if (type === "i16") return 16;
    if (type === "i32") return 32;
    if (type === "i64") return 64;
    return 0;
  }

  private isSigned(type: AST.TypeNode): boolean {
    if (type.kind === "BasicType") {
      return [
        "int",
        "i8",
        "i16",
        "i32",
        "i64",
        "char",
        "short",
        "long",
      ].includes((type as AST.BasicTypeNode).name);
    }
    return false;
  }

  private isIntegerType(type: string): boolean {
    return ["i1", "i8", "i16", "i32", "i64"].includes(type);
  }

  private emitParentDestroy(
    structDecl: AST.StructDecl,
    funcDecl: AST.FunctionDecl,
  ) {
    let parentTypeNode: AST.BasicTypeNode | undefined;
    if (structDecl.inheritanceList) {
      for (const t of structDecl.inheritanceList) {
        if (t.kind === "BasicType" && this.structMap.has(t.name)) {
          parentTypeNode = t;
          break;
        }
      }
    }

    if (!parentTypeNode) return;

    let parentName = parentTypeNode.name;

    // Find parent struct and destroy method to get correct mangled name
    const parentStruct = this.structMap.get(parentName);
    if (!parentStruct) return;

    const destroyMethod = parentStruct.members.find(
      (m) => m.kind === "FunctionDecl" && m.name === "destroy",
    ) as AST.FunctionDecl | undefined;

    if (!destroyMethod) return;

    const funcName = `${parentName}_destroy`;
    const funcType = destroyMethod.resolvedType as AST.FunctionTypeNode;
    const mangledName = this.getMangledName(funcName, funcType);

    const thisParam = funcDecl.params.find((p) => p.name === "this");
    if (!thisParam) return;

    const thisPtr =
      this.localPointers.get(thisParam.name) || `%${thisParam.name}_ptr`;
    const thisType = this.resolveType(thisParam.type);

    const thisVal = this.newRegister();
    this.emit(`  ${thisVal} = load ${thisType}, ${thisType}* ${thisPtr}`);

    const parentTypeStr = this.resolveType(parentTypeNode);
    const parentPtrType = `${parentTypeStr}*`;

    const parentPtr = this.newRegister();
    this.emit(
      `  ${parentPtr} = bitcast ${thisType} ${thisVal} to ${parentPtrType}`,
    );

    this.emit(`  call void @${mangledName}(${parentPtrType} ${parentPtr})`);
  }

  private emitThrow(value: string, type: string) {
    // Store the exception type ID
    const typeId = this.getTypeId(type);
    this.emit(`  store i32 ${typeId}, i32* @exception_type`);

    // Cast and store the exception value as i64
    const valueSize = this.newRegister();
    this.emit(`  ${valueSize} = ptrtoint ${type}* null to i64`);
    const allocSize = this.newRegister();
    this.emit(`  ${allocSize} = add i64 ${valueSize}, 0`);

    // Allocate memory for the exception value
    const exceptionMem = this.newRegister();
    this.emit(
      `  ${exceptionMem} = call i8* @malloc(i64 ptrtoint (${type}* getelementptr (${type}, ${type}* null, i32 1) to i64))`,
    );
    const exceptionPtr = this.newRegister();
    this.emit(`  ${exceptionPtr} = bitcast i8* ${exceptionMem} to ${type}*`);
    this.emit(`  store ${type} ${value}, ${type}* ${exceptionPtr}`);

    const castVal = this.newRegister();
    this.emit(`  ${castVal} = ptrtoint ${type}* ${exceptionPtr} to i64`);
    this.emit(`  store i64 ${castVal}, i64* @exception_value`);

    // Longjmp to the exception handler
    const framePtr = this.newRegister();
    this.emit(
      `  ${framePtr} = load %struct.ExceptionFrame*, %struct.ExceptionFrame** @exception_top`,
    );

    const isNull = this.newRegister();
    this.emit(
      `  ${isNull} = icmp eq %struct.ExceptionFrame* ${framePtr}, null`,
    );

    const abortLabel = this.newLabel("throw.abort");
    const jumpLabel = this.newLabel("throw.jump");

    this.emit(`  br i1 ${isNull}, label %${abortLabel}, label %${jumpLabel}`);

    this.emit(`${abortLabel}:`);
    this.emit(`  call void @exit(i32 1)`);
    this.emit(`  unreachable`);

    this.emit(`${jumpLabel}:`);
    const bufFieldPtr = this.newRegister();
    this.emit(
      `  ${bufFieldPtr} = getelementptr inbounds %struct.ExceptionFrame, %struct.ExceptionFrame* ${framePtr}, i32 0, i32 0`,
    );

    const bufVoidPtr = this.newRegister();
    this.emit(`  ${bufVoidPtr} = bitcast [32 x i64]* ${bufFieldPtr} to i8*`);

    this.emit(`  call void @longjmp(i8* ${bufVoidPtr}, i32 1)`);
    this.emit(`  unreachable`);
  }

  private getTypeId(type: string): number {
    if (this.typeIdMap.has(type)) {
      return this.typeIdMap.get(type)!;
    }
    const id = this.nextTypeId++;
    this.typeIdMap.set(type, id);
    return id;
  }
}
