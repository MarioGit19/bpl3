import * as AST from "../common/AST";
import { Token } from "../frontend/Token";
import { TokenType } from "../frontend/TokenType";

export class CodeGenerator {
  private output: string[] = [];
  private registerCount: number = 0;
  private labelCount: number = 0;
  private stringLiterals: Map<string, string> = new Map(); // content -> global var name
  private currentFunctionReturnType: AST.TypeNode | null = null;
  private structLayouts: Map<string, Map<string, number>> = new Map();
  private loopStack: { continueLabel: string; breakLabel: string }[] = [];
  private declaredFunctions: Set<string> = new Set();
  private globals: Set<string> = new Set();
  private locals: Set<string> = new Set();

  generate(program: AST.Program): string {
    this.output = [];
    this.stringLiterals.clear();
    this.structLayouts.clear();
    this.loopStack = [];
    this.declaredFunctions.clear();
    this.globals.clear();
    this.locals.clear();

    this.collectStructLayouts(program);

    // Standard library declarations
    this.emit("declare i8* @malloc(i64)");
    this.declaredFunctions.add("malloc");
    this.emit("declare void @free(i8*)");
    this.declaredFunctions.add("free");
    this.emit("declare void @exit(i32)");
    this.declaredFunctions.add("exit");
    this.emit("");

    for (const stmt of program.statements) {
      this.generateTopLevel(stmt);
    }

    let header = "";
    for (const [content, varName] of this.stringLiterals) {
      const len = content.length + 1;
      const escaped = this.escapeString(content);
      header += `${varName} = private unnamed_addr constant [${len} x i8] c"${escaped}\\00", align 1\n`;
    }

    return header + "\n" + this.output.join("\n");
  }

  private emit(line: string) {
    this.output.push(line);
  }

  private collectStructLayouts(program: AST.Program) {
    for (const stmt of program.statements) {
      if (stmt.kind === "StructDecl") {
        const decl = stmt as AST.StructDecl;
        const layout = new Map<string, number>();
        const fields = decl.members.filter(
          (m) => m.kind === "StructField",
        ) as AST.StructField[];
        fields.forEach((f, i) => layout.set(f.name, i));
        this.structLayouts.set(decl.name, layout);
      }
    }
  }

  private generateTopLevel(node: AST.ASTNode) {
    switch (node.kind) {
      case "FunctionDecl":
        this.generateFunction(node as AST.FunctionDecl);
        break;
      case "StructDecl":
        this.generateStruct(node as AST.StructDecl);
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
      // TODO: Global variables
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
    this.emit(`declare ${retType} @${name}(${paramStr})`);
    this.emit("");
  }

  private generateStruct(decl: AST.StructDecl) {
    // %struct.Name = type { ... }
    const fields = decl.members.filter(
      (m) => m.kind === "StructField",
    ) as AST.StructField[];
    const fieldTypes = fields.map((f) => this.resolveType(f.resolvedType || f.type)).join(", ");
    this.emit(`%struct.${decl.name} = type { ${fieldTypes} }`);
    this.emit("");

    // Generate methods
    const methods = decl.members.filter(
      (m) => m.kind === "FunctionDecl",
    ) as AST.FunctionDecl[];

    for (const method of methods) {
      const originalName = method.name;
      method.name = `${decl.name}_${method.name}`;
      this.generateFunction(method);
      method.name = originalName;
    }
  }

  private generateFunction(decl: AST.FunctionDecl) {
    this.registerCount = 0;
    this.labelCount = 0;
    this.currentFunctionReturnType = decl.returnType;
    this.locals.clear();

    const name = decl.name;
    const funcType = decl.resolvedType as AST.FunctionTypeNode;
    const retType = this.resolveType(funcType.returnType);

    const params = decl.params
      .map((p, i) => {
        const type = this.resolveType(funcType.paramTypes[i]!);
        const name = `%${p.name}`;
        return `${type} ${name}`;
      })
      .join(", ");

    this.emit(`define ${retType} @${name}(${params}) {`);
    this.emit("entry:");

    // Allocate stack space for parameters to make them mutable
    for (let i = 0; i < decl.params.length; i++) {
      const param = decl.params[i]!;
      this.locals.add(param.name);
      const type = this.resolveType(funcType.paramTypes[i]!);
      const paramReg = `%${param.name}`;
      const stackAddr = this.allocateStack(param.name, type);
      this.emit(`  store ${type} ${paramReg}, ${type}* ${stackAddr}`);
    }

    this.generateBlock(decl.body);

    // Add implicit return for void functions if missing
    const lastLine =
      this.output.length > 0 ? this.output[this.output.length - 1]! : "";
    if (retType === "void" && !lastLine.trim().startsWith("ret")) {
      this.emit("  ret void");
    } else if (retType !== "void" && !lastLine.trim().startsWith("ret")) {
      // If control flow reaches end of non-void function without return, it's UB, but let's emit unreachable or 0
      if (retType === "i64") this.emit("  ret i64 0");
      else this.emit("  unreachable");
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
      default:
        // console.warn(`Unhandled statement kind: ${stmt.kind}`);
        break;
    }
  }

  private generateBreak(stmt: AST.BreakStmt) {
    if (this.loopStack.length === 0) {
      throw new Error("Break statement outside of loop");
    }
    const { breakLabel } = this.loopStack[this.loopStack.length - 1]!;
    this.emit(`  br label %${breakLabel}`);
  }

  private generateContinue(stmt: AST.ContinueStmt) {
    if (this.loopStack.length === 0) {
      throw new Error("Continue statement outside of loop");
    }
    const { continueLabel } = this.loopStack[this.loopStack.length - 1]!;
    this.emit(`  br label %${continueLabel}`);
  }

  private generateVariableDecl(decl: AST.VariableDecl) {
    if (typeof decl.name !== "string") {
      throw new Error("Destructuring not supported in code generation yet");
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
        decl.resolvedType || decl.typeAnnotation || decl.initializer.resolvedType!,
      );
      this.emit(`  store ${type} ${castVal}, ${type}* ${addr}`);
    }
  }

  private generateReturn(stmt: AST.ReturnStmt) {
    if (stmt.value) {
      const val = this.generateExpression(stmt.value);
      const type = this.resolveType(this.currentFunctionReturnType!);
      this.emit(`  ret ${type} ${val}`);
    } else {
      this.emit("  ret void");
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
      case "StructLiteral":
        return this.generateStructLiteral(expr as AST.StructLiteralExpr);
      case "Sizeof":
        return this.generateSizeof(expr as AST.SizeofExpr);
      default:
        // console.warn(`Unhandled expression kind: ${expr.kind}`);
        return "0"; // Placeholder
    }
  }

  private generateLiteral(expr: AST.LiteralExpr): string {
    if (expr.type === "number") {
      return expr.value.toString();
    } else if (expr.type === "bool") {
      return expr.value ? "1" : "0";
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
    const type = this.resolveType(expr.resolvedType!);
    const addr = this.generateAddress(expr);
    const reg = this.newRegister();
    this.emit(`  ${reg} = load ${type}, ${type}* ${addr}`);
    return reg;
  }

  private generateBinary(expr: AST.BinaryExpr): string {
    const leftRaw = this.generateExpression(expr.left);
    const rightRaw = this.generateExpression(expr.right);
    const leftType = this.resolveType(expr.left.resolvedType!);
    const rightType = this.resolveType(expr.right.resolvedType!);
    const reg = this.newRegister();

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
        this.emit(
          `  ${reg} = getelementptr inbounds ${leftType.slice(0, -1)}, ${leftType} ${leftRaw}, i64 ${right}`,
        );
        return reg;
      } else if (expr.operator.type === TokenType.Minus) {
        // ptr - int -> ptr + (-int)
        const negRight = this.newRegister();
        this.emit(`  ${negRight} = sub i64 0, ${right}`);
        this.emit(
          `  ${reg} = getelementptr inbounds ${leftType.slice(0, -1)}, ${leftType} ${leftRaw}, i64 ${negRight}`,
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

      this.emit(
        `  ${reg} = getelementptr inbounds ${rightType.slice(0, -1)}, ${rightType} ${rightRaw}, i64 ${left}`,
      );
      return reg;
    }

    const left = leftRaw;
    const right = rightRaw;

    let op = "";
    switch (expr.operator.type) {
      case TokenType.Plus:
        op = "add";
        break;
      case TokenType.Minus:
        op = "sub";
        break;
      case TokenType.Star:
        op = "mul";
        break;
      case TokenType.Slash:
        op = "sdiv";
        break; // Signed division
      case TokenType.EqualEqual:
        op = "icmp eq";
        break;
      case TokenType.BangEqual:
        op = "icmp ne";
        break;
      case TokenType.Less:
        op = "icmp slt";
        break;
      case TokenType.LessEqual:
        op = "icmp sle";
        break;
      case TokenType.Greater:
        op = "icmp sgt";
        break;
      case TokenType.GreaterEqual:
        op = "icmp sge";
        break;
      case TokenType.Percent:
        op = "srem";
        break;
    }

    if (op) {
      this.emit(`  ${reg} = ${op} ${leftType} ${left}, ${right}`);
      return reg;
    }
    return "0";
  }

  private generateCall(expr: AST.CallExpr): string {
    let funcName = "";
    let argsToGenerate = expr.args;
    let isInstanceCall = false;

    if (expr.callee.kind === "Identifier") {
      funcName = (expr.callee as AST.IdentifierExpr).name;
    } else if (expr.callee.kind === "Member") {
      const memberExpr = expr.callee as AST.MemberExpr;
      const objType = memberExpr.object.resolvedType;

      if (!objType) throw new Error("Member access on unresolved type");

      let structName = "";
      if (objType.kind === "BasicType") {
        structName = objType.name;
        // Instance call: pass object as first argument
        argsToGenerate = [memberExpr.object, ...expr.args];
        isInstanceCall = true;
      } else if (objType.kind === "MetaType") {
        const inner = (objType as any).type;
        if (inner.kind === "BasicType") {
          structName = inner.name;
          // Static call: no extra argument
        } else {
          throw new Error("Static member access on non-struct type");
        }
      } else {
        throw new Error("Member access on non-struct type");
      }

      funcName = `${structName}_${memberExpr.property}`;
    } else {
      throw new Error("Only direct function calls supported for now");
    }

    const funcType = expr.callee.resolvedType as AST.FunctionTypeNode;

    const args = argsToGenerate
      .map((arg, i) => {
        const val = this.generateExpression(arg);
        const srcType = this.resolveType(arg.resolvedType!);

        let targetTypeNode: AST.TypeNode | undefined;
        if (isInstanceCall) {
          if (i === 0) {
            targetTypeNode = arg.resolvedType;
          } else {
            targetTypeNode = funcType.paramTypes[i - 1];
          }
        } else {
          targetTypeNode = funcType.paramTypes[i];
        }

        if (targetTypeNode) {
          const destType = this.resolveType(targetTypeNode);
          const castVal = this.emitCast(
            val,
            srcType,
            destType,
            arg.resolvedType!,
            targetTypeNode,
          );
          return `${destType} ${castVal}`;
        }
        return `${srcType} ${val}`;
      })
      .join(", ");

    const retType = this.resolveType(expr.resolvedType!);
    const isVariadic = funcType.isVariadic === true;

    if (retType === "void") {
      if (isVariadic) {
        // Build the full signature for variadic functions
        const paramTypesStr = funcType.paramTypes.map(t => this.resolveType(t)).join(", ");
        this.emit(`  call void (${paramTypesStr}, ...) @${funcName}(${args})`);
      } else {
        this.emit(`  call void @${funcName}(${args})`);
      }
      return "";
    } else {
      const reg = this.newRegister();
      if (isVariadic) {
        // Build the full signature for variadic functions
        const paramTypesStr = funcType.paramTypes.map(t => this.resolveType(t)).join(", ");
        this.emit(`  ${reg} = call ${retType} (${paramTypesStr}, ...) @${funcName}(${args})`);
      } else {
        this.emit(`  ${reg} = call ${retType} @${funcName}(${args})`);
      }
      return reg;
    }
  }

  private generateAddress(expr: AST.Expression): string {
    if (expr.kind === "Identifier") {
      const name = (expr as AST.IdentifierExpr).name;
      if (this.locals.has(name)) {
        return `%${name}_ptr`;
      } else if (this.globals.has(name)) {
        return `@${name}`;
      } else {
        // Maybe it's a function parameter that wasn't added to locals?
        // Or an error.
        // For now assume local if not global, to support params if I missed something.
        // But I added params to locals.
        // What about function names? (Function pointers)
        // If it's a function, we return the function pointer?
        // But generateAddress is for lvalues (storage).
        // Functions are not lvalues unless we have function pointers variables.
        return `%${name}_ptr`;
      }
    } else if (expr.kind === "Member") {
      const memberExpr = expr as AST.MemberExpr;
      const objectAddr = this.generateAddress(memberExpr.object);

      // We need the type of the object to know which struct layout to use
      // The object's resolvedType should be a BasicType with the struct name
      const objType = memberExpr.object.resolvedType;
      if (!objType || objType.kind !== "BasicType") {
        throw new Error("Member access on non-struct type");
      }

      const structName = objType.name;
      const layout = this.structLayouts.get(structName);
      if (!layout) {
        throw new Error(`Unknown struct type: ${structName}`);
      }

      const fieldIndex = layout.get(memberExpr.property);
      if (fieldIndex === undefined) {
        throw new Error(
          `Unknown field '${memberExpr.property}' in struct '${structName}'`,
        );
      }

      const addr = this.newRegister();
      const llvmType = `%struct.${structName}`;
      this.emit(
        `  ${addr} = getelementptr inbounds ${llvmType}, ${llvmType}* ${objectAddr}, i32 0, i32 ${fieldIndex}`,
      );
      return addr;
    } else if (expr.kind === "Index") {
      const indexExpr = expr as AST.IndexExpr;
      const objectAddr = this.generateAddress(indexExpr.object);
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

      const addr = this.newRegister();

      if (objType.arrayDimensions.length > 0) {
        // Array indexing
        // If it's a fixed size array on stack (alloca [N x T]), objectAddr is [N x T]*
        // We need to use GEP with 0, index

        // However, if it's passed as parameter, it might be T* (decayed)
        // But my resolveType for arrays isn't fully implemented yet.

        // Let's assume for now arrays are pointers or [N x T]
        // If resolveType returns [N x T], we need 0, index.
        // If resolveType returns T*, we need index.

        const llvmType = this.resolveType(objType);
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
        // Pointer indexing
        // objectAddr is T** (address of the pointer variable)
        // We need to load the pointer first
        const ptrReg = this.newRegister();
        const ptrType = this.resolveType(objType); // T*
        this.emit(`  ${ptrReg} = load ${ptrType}, ${ptrType}* ${objectAddr}`);

        // Now GEP on the pointer
        // The element type is T (ptrType minus one *)
        // But GEP takes the pointer type.
        // Wait, GEP syntax: getelementptr <ty>, <ty>* <ptrval>, <indices>
        // <ty> is the type of the element we are indexing into? No, it's the type of the base.
        // In LLVM < 8: getelementptr <ty>*, <ty>** ...
        // In modern LLVM: getelementptr <ty>, <ty>* ...

        // If ptrReg is i32*, and we want ptrReg[i], we do GEP i32, i32* ptrReg, i

        // We need the element type.
        const elemType = this.resolveType(indexExpr.resolvedType!);
        this.emit(
          `  ${addr} = getelementptr inbounds ${elemType}, ${ptrType} ${ptrReg}, i64 ${indexVal}`,
        );
      } else {
        throw new Error("Indexing non-array/non-pointer");
      }

      return addr;
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
    this.emit(`@${decl.name} = global ${type} ${init}`);
    this.emit("");
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

    this.emit(
      `  br i1 ${leftVal}, label %${trueLabel}, label %${falseLabel}`,
    );

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
    const falseLabel = this.newLabel("or.false");
    const endLabel = this.newLabel("or.end");

    this.emit(
      `  br i1 ${leftVal}, label %${trueLabel}, label %${falseLabel}`,
    );

    this.emit(`${trueLabel}:`);
    this.emit(`  store i1 1, i1* ${resPtr}`);
    this.emit(`  br label %${endLabel}`);

    this.emit(`${falseLabel}:`);
    const rightVal = this.generateExpression(expr.right);
    this.emit(`  store i1 ${rightVal}, i1* ${resPtr}`);
    this.emit(`  br label %${endLabel}`);

    this.emit(`${endLabel}:`);
    const reg = this.newRegister();
    this.emit(`  ${reg} = load i1, i1* ${resPtr}`);
    return reg;
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

  private resolveType(type: AST.TypeNode): string {
    if (type.kind === "BasicType") {
      const basicType = type as AST.BasicTypeNode;
      let llvmType = "";
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
          llvmType = "void";
          break;
        case "string":
          llvmType = "i8*";
          break;
        default:
          llvmType = `%struct.${basicType.name}`;
          break;
      }

      for (let i = 0; i < basicType.pointerDepth; i++) {
        llvmType += "*";
      }
      
      for (let i = basicType.arrayDimensions.length - 1; i >= 0; i--) {
        llvmType = `[${basicType.arrayDimensions[i]} x ${llvmType}]`;
      }
      
      return llvmType;
    } else if (type.kind === "FunctionType") {
        const funcType = type as AST.FunctionTypeNode;
        const ret = this.resolveType(funcType.returnType);
        const params = funcType.paramTypes.map(p => this.resolveType(p)).join(", ");
        return `${ret} (${params})*`;
    }
    return "void";
  }

  private newRegister(): string {
    return `%${this.registerCount++}`;
  }

  private newLabel(name: string): string {
    return `${name}.${this.labelCount++}`;
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

  private allocateStack(name: string, type: string): string {
    const ptr = `%${name}_ptr`;
    this.emit(`  ${ptr} = alloca ${type}`);
    this.locals.add(name);
    return ptr;
  }

  private generateAssignment(expr: AST.AssignmentExpr): string {
    const val = this.generateExpression(expr.value);
    const addr = this.generateAddress(expr.assignee);
    
    const destType = this.resolveType(expr.assignee.resolvedType!);
    const srcType = this.resolveType(expr.value.resolvedType!);
    
    const castVal = this.emitCast(val, srcType, destType, expr.value.resolvedType!, expr.assignee.resolvedType!);
    
    this.emit(`  store ${destType} ${castVal}, ${destType}* ${addr}`);
    return castVal;
  }

  private generateMember(expr: AST.MemberExpr): string {
    const addr = this.generateAddress(expr);
    const type = this.resolveType(expr.resolvedType!);
    const reg = this.newRegister();
    this.emit(`  ${reg} = load ${type}, ${type}* ${addr}`);
    return reg;
  }

  private generateIndex(expr: AST.IndexExpr): string {
    const addr = this.generateAddress(expr);
    const type = this.resolveType(expr.resolvedType!);
    const reg = this.newRegister();
    this.emit(`  ${reg} = load ${type}, ${type}* ${addr}`);
    return reg;
  }

  private generateUnary(expr: AST.UnaryExpr): string {
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
    }
    return "0";
  }

  private generateCast(expr: AST.CastExpr): string {
    const val = this.generateExpression(expr.expression);
    const srcType = this.resolveType(expr.expression.resolvedType!);
    const destType = this.resolveType(expr.targetType);
    return this.emitCast(val, srcType, destType, expr.expression.resolvedType!, expr.targetType);
  }

  private generateStructLiteral(expr: AST.StructLiteralExpr): string {
    const type = this.resolveType(expr.resolvedType!);
    let structVal = "undef";
    
    const structName = (expr.resolvedType as AST.BasicTypeNode).name;
    const layout = this.structLayouts.get(structName)!;
    
    const fieldValues = new Map<string, AST.Expression>();
    for (const field of expr.fields) {
      fieldValues.set(field.name, field.value);
    }
    
    const sortedFields = Array.from(layout.entries()).sort((a, b) => a[1] - b[1]);
    
    for (const [fieldName, fieldIndex] of sortedFields) {
      const valExpr = fieldValues.get(fieldName);
      if (valExpr) {
        const val = this.generateExpression(valExpr);
        const fieldType = this.resolveType(valExpr.resolvedType!);
        const nextVal = this.newRegister();
        this.emit(`  ${nextVal} = insertvalue ${type} ${structVal}, ${fieldType} ${val}, ${fieldIndex}`);
        structVal = nextVal;
      }
    }
    
    return structVal;
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
      return ["int", "i8", "i16", "i32", "i64", "char", "short", "long"].includes(
        (type as AST.BasicTypeNode).name,
      );
    }
    return false;
  }

  private isIntegerType(type: string): boolean {
    return ["i1", "i8", "i16", "i32", "i64"].includes(type);
  }
}
