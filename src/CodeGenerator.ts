import * as AST from "./AST";
import { Token } from "./Token";
import { TokenType } from "./TokenType";

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

    const retType = decl.returnType
      ? this.resolveType(decl.returnType)
      : "void";

    const params = decl.params.map((p) => this.resolveType(p.type));
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
    const fieldTypes = fields.map((f) => this.resolveType(f.type)).join(", ");
    this.emit(`%struct.${decl.name} = type { ${fieldTypes} }`);
    this.emit("");
  }

  private generateFunction(decl: AST.FunctionDecl) {
    this.registerCount = 0;
    this.labelCount = 0;
    this.currentFunctionReturnType = decl.returnType;
    this.locals.clear();

    const name = decl.name;
    const retType = this.resolveType(decl.returnType);

    const params = decl.params
      .map((p) => {
        const type = this.resolveType(p.type);
        const name = `%${p.name}`;
        return `${type} ${name}`;
      })
      .join(", ");

    this.emit(`define ${retType} @${name}(${params}) {`);
    this.emit("entry:");

    // Allocate stack space for parameters to make them mutable
    for (const param of decl.params) {
      this.locals.add(param.name);
      const type = this.resolveType(param.type);
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
      default:
        // console.warn(`Unhandled statement kind: ${stmt.kind}`);
        break;
    }
  }

  private generateBreak(stmt: AST.BreakStmt) {
    if (this.loopStack.length === 0) {
      throw new Error("Break statement outside of loop");
    }
    const { breakLabel } = this.loopStack[this.loopStack.length - 1];
    this.emit(`  br label %${breakLabel}`);
  }

  private generateContinue(stmt: AST.ContinueStmt) {
    if (this.loopStack.length === 0) {
      throw new Error("Continue statement outside of loop");
    }
    const { continueLabel } = this.loopStack[this.loopStack.length - 1];
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

    const type = decl.typeAnnotation
      ? this.resolveType(decl.typeAnnotation)
      : this.resolveType(decl.initializer!.resolvedType!);
    const addr = this.allocateStack(decl.name, type);

    if (decl.initializer) {
      const val = this.generateExpression(decl.initializer);
      this.emit(`  store ${type} ${val}, ${type}* ${addr}`);
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
        return this.generateBinary(expr as AST.BinaryExpr);
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
    const left = this.generateExpression(expr.left);
    const right = this.generateExpression(expr.right);
    const leftType = this.resolveType(expr.left.resolvedType!);
    const rightType = this.resolveType(expr.right.resolvedType!);
    const reg = this.newRegister();

    // Pointer arithmetic
    if (leftType.endsWith("*") && rightType === "i64") {
      // ptr + int
      if (expr.operator.type === TokenType.Plus) {
        this.emit(
          `  ${reg} = getelementptr inbounds ${leftType.slice(0, -1)}, ${leftType} ${left}, i64 ${right}`,
        );
        return reg;
      } else if (expr.operator.type === TokenType.Minus) {
        // ptr - int -> ptr + (-int)
        const negRight = this.newRegister();
        this.emit(`  ${negRight} = sub i64 0, ${right}`);
        this.emit(
          `  ${reg} = getelementptr inbounds ${leftType.slice(0, -1)}, ${leftType} ${left}, i64 ${negRight}`,
        );
        return reg;
      }
    }

    // int + ptr (commutative)
    if (
      leftType === "i64" &&
      rightType.endsWith("*") &&
      expr.operator.type === TokenType.Plus
    ) {
      this.emit(
        `  ${reg} = getelementptr inbounds ${rightType.slice(0, -1)}, ${rightType} ${right}, i64 ${left}`,
      );
      return reg;
    }

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
    }

    if (op) {
      this.emit(`  ${reg} = ${op} ${leftType} ${left}, ${right}`);
      return reg;
    }
    return "0";
  }

  private generateCall(expr: AST.CallExpr): string {
    if (expr.callee.kind !== "Identifier") {
      throw new Error("Only direct function calls supported for now");
    }
    const funcName = (expr.callee as AST.IdentifierExpr).name;
    const args = expr.args
      .map((arg) => {
        const val = this.generateExpression(arg);
        const type = this.resolveType(arg.resolvedType!);
        return `${type} ${val}`;
      })
      .join(", ");

    const retType = this.resolveType(expr.resolvedType!);

    if (retType === "void") {
      this.emit(`  call void @${funcName}(${args})`);
      return "";
    } else {
      const reg = this.newRegister();
      this.emit(`  ${reg} = call ${retType} @${funcName}(${args})`);
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
      const indexVal = this.generateExpression(indexExpr.index);

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
        // If resolveType returns [N x T], then we need 0, index.
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

  private generateAssignment(expr: AST.AssignmentExpr): string {
    const addr = this.generateAddress(expr.assignee);
    const val = this.generateExpression(expr.value);
    const type = this.resolveType(expr.assignee.resolvedType!);

    this.emit(`  store ${type} ${val}, ${type}* ${addr}`);
    return val;
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

  private generateStructLiteral(expr: AST.StructLiteralExpr): string {
    // We need to know the struct type name.
    // The parser/typechecker should have resolved the type.
    // But StructLiteralExpr doesn't have the type name explicitly in AST unless resolvedType is set.
    // TypeChecker checkStructLiteral should set resolvedType.

    const type = expr.resolvedType;
    if (!type || type.kind !== "BasicType") {
      throw new Error("Struct literal has no resolved struct type");
    }

    const structName = type.name;
    const llvmType = `%struct.${structName}`;
    const layout = this.structLayouts.get(structName);
    if (!layout) {
      throw new Error(`Unknown struct layout for ${structName}`);
    }

    let val = "undef"; // Start with undefined struct value

    // We need to insert fields in order? Or by name?
    // insertvalue takes index.
    // We iterate over expr.fields.

    // But we need to handle fields that are NOT in expr.fields (if partial init is allowed? No, usually all required).
    // Assuming all fields are provided or we default init?
    // Let's assume expr.fields contains what we need.

    // We need to update 'val' sequentially.
    // Since we are in SSA, we need new registers for each step.

    let currentReg = "undef";

    // We need to sort fields by index to be safe? Or just insert by index.
    // insertvalue works on the value from previous step.
    for (const field of expr.fields) {
      const fieldIndex = layout.get(field.name);
      if (fieldIndex === undefined) {
        throw new Error(`Unknown field ${field.name} in struct ${structName}`);
      }

      const fieldValue = this.generateExpression(field.value);
      const fieldType = this.resolveType(field.value.resolvedType!);

      const nextReg = this.newRegister();
      if (currentReg === "undef") {
        this.emit(
          `  ${nextReg} = insertvalue ${llvmType} undef, ${fieldType} ${fieldValue}, ${fieldIndex}`,
        );
      } else {
        this.emit(
          `  ${nextReg} = insertvalue ${llvmType} ${currentReg}, ${fieldType} ${fieldValue}, ${fieldIndex}`,
        );
      }
      currentReg = nextReg;
    }

    return currentReg;
  }

  // --- Helpers ---

  private resolveType(type: AST.TypeNode): string {
    if (!type) {
      return "void";
    }
    if (type.kind === "BasicType") {
      let llvmType = "";
      switch (type.name) {
        case "int":
          llvmType = "i64";
          break;
        case "float":
          llvmType = "double";
          break;
        case "bool":
          llvmType = "i1";
          break;
        case "char":
          llvmType = "i8";
          break;
        case "void":
          llvmType = "void";
          break;
        case "string":
          llvmType = "i8*";
          break;
        default:
          llvmType = `%struct.${type.name}`;
          break;
      }

      // Handle pointers
      for (let i = 0; i < type.pointerDepth; i++) {
        llvmType += "*";
      }

      // Handle arrays (from inside out)
      // int[2][3] -> [2 x [3 x i64]]
      // My AST stores [2, 3]
      for (let i = type.arrayDimensions.length - 1; i >= 0; i--) {
        const dim = type.arrayDimensions[i];
        if (dim === null) {
          // Unsized array? Usually decays to pointer or not allowed as value type
          llvmType += "*";
        } else {
          llvmType = `[${dim} x ${llvmType}]`;
        }
      }

      return llvmType;
    }
    return "void";
  }

  private allocateStack(name: string, type: string): string {
    const addr = `%${name}_ptr`;
    this.emit(`  ${addr} = alloca ${type}`);
    return addr;
  }

  private newRegister(): string {
    return `%${this.registerCount++}`;
  }

  private newLabel(prefix: string): string {
    return `${prefix}.${this.labelCount++}`;
  }

  private isTerminator(line: string): boolean {
    if (!line) return false;
    const trimmed = line.trim();
    return (
      trimmed.startsWith("ret") ||
      trimmed.startsWith("br") ||
      trimmed.startsWith("unreachable")
    );
  }

  private escapeString(str: string): string {
    return str
      .replace(/\\/g, "\\5C")
      .replace(/"/g, "\\22")
      .replace(/\n/g, "\\0A")
      .replace(/\t/g, "\\09");
  }

  private generateUnary(expr: AST.UnaryExpr): string {
    const op = expr.operator.type;
    if (op === TokenType.Ampersand) {
      // Address of: &x
      return this.generateAddress(expr.operand);
    } else if (op === TokenType.Star) {
      // Dereference: *x
      // To get the value, we load from the address
      const addr = this.generateAddress(expr);
      const type = this.resolveType(expr.resolvedType!);
      const reg = this.newRegister();
      this.emit(`  ${reg} = load ${type}, ${type}* ${addr}`);
      return reg;
    } else if (op === TokenType.Minus) {
      // Negation: -x
      const val = this.generateExpression(expr.operand);
      const type = this.resolveType(expr.resolvedType!);
      const reg = this.newRegister();
      if (type === "double") {
        this.emit(`  ${reg} = fneg ${type} ${val}`);
      } else {
        this.emit(`  ${reg} = sub ${type} 0, ${val}`);
      }
      return reg;
    } else if (op === TokenType.Bang) {
      // Logical Not: !x
      const val = this.generateExpression(expr.operand);
      const reg = this.newRegister();
      this.emit(`  ${reg} = icmp eq i1 ${val}, 0`); // Assuming bool is i1
      return reg;
    }
    // TODO: Tilde (Bitwise Not)
    return "0";
  }

  private generateCast(expr: AST.CastExpr): string {
    const val = this.generateExpression(expr.expression);
    const srcType = this.resolveType(expr.expression.resolvedType!);
    const destType = this.resolveType(expr.targetType);
    const reg = this.newRegister();

    if (srcType === destType) return val;

    // Pointer to Pointer (bitcast)
    if (srcType.endsWith("*") && destType.endsWith("*")) {
      this.emit(`  ${reg} = bitcast ${srcType} ${val} to ${destType}`);
      return reg;
    }

    // Int to Pointer (inttoptr)
    if (srcType === "i64" && destType.endsWith("*")) {
      this.emit(`  ${reg} = inttoptr i64 ${val} to ${destType}`);
      return reg;
    }

    // Pointer to Int (ptrtoint)
    if (srcType.endsWith("*") && destType === "i64") {
      this.emit(`  ${reg} = ptrtoint ${srcType} ${val} to i64`);
      return reg;
    }

    // Int to Float (sitofp)
    if (srcType === "i64" && destType === "double") {
      this.emit(`  ${reg} = sitofp i64 ${val} to double`);
      return reg;
    }

    // Float to Int (fptosi)
    if (srcType === "double" && destType === "i64") {
      this.emit(`  ${reg} = fptosi double ${val} to i64`);
      return reg;
    }

    // Bool to Int (zext)
    if (srcType === "i1" && destType === "i64") {
      this.emit(`  ${reg} = zext i1 ${val} to i64`);
      return reg;
    }

    // Int to Bool (icmp ne 0)
    if (srcType === "i64" && destType === "i1") {
      this.emit(`  ${reg} = icmp ne i64 ${val}, 0`);
      return reg;
    }

    // Default bitcast (unsafe)
    this.emit(`  ${reg} = bitcast ${srcType} ${val} to ${destType}`);
    return reg;
  }

  private generateGlobalVariable(decl: AST.VariableDecl) {
    if (typeof decl.name !== "string") {
      throw new Error("Destructuring not supported for global variables");
    }

    this.globals.add(decl.name);

    const type = this.resolveType(
      decl.typeAnnotation || decl.initializer!.resolvedType!,
    );

    let init = "zeroinitializer";
    if (decl.initializer) {
      if (decl.initializer.kind === "Literal") {
        init = this.generateLiteral(decl.initializer as AST.LiteralExpr);
      } else {
        throw new Error("Global variables must be initialized with literals");
      }
    } else {
      // Default initialization
      if (type === "i64" || type === "i32" || type === "i8" || type === "i1")
        init = "0";
      else if (type === "double") init = "0.0";
      else if (type.endsWith("*")) init = "null";
      else init = "zeroinitializer";
    }

    this.emit(`@${decl.name} = global ${type} ${init}`);
    this.emit("");
  }

  private generateSizeof(expr: AST.SizeofExpr): string {
    let type: AST.TypeNode;
    if ("kind" in expr.target && (expr.target.kind as string) !== "BasicType") {
      // It's an expression
      type = (expr.target as AST.Expression).resolvedType!;
    } else {
      // It's a type
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
}
