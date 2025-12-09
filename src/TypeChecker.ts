import * as AST from "./AST";
import { SymbolTable, type Symbol, type SymbolKind } from "./SymbolTable";
import { CompilerError, type SourceLocation } from "./CompilerError";
import * as fs from "fs";
import * as path from "path";
import { Lexer } from "./Lexer";
import { Parser } from "./Parser";
import { TokenType } from "./TokenType";

export class TypeChecker {
    private globalScope: SymbolTable;
    private currentScope: SymbolTable;
    private currentFunctionReturnType: AST.TypeNode | undefined;
    private modules: Map<string, SymbolTable> = new Map();

    constructor() {
        this.globalScope = new SymbolTable();
        this.currentScope = this.globalScope;
        this.initializeBuiltins();
        // Register the current "main" module if we knew its name, but we don't.
        // We'll handle imports relative to the file location.
    }

    private initializeBuiltins() {
        this.initializeBuiltinsInScope(this.globalScope);
    }

    private initializeBuiltinsInScope(scope: SymbolTable) {
        const builtins = ["int", "float", "bool", "char", "string", "void", "null", "nullptr"];
        for (const name of builtins) {
            scope.define({
                name,
                kind: "TypeAlias",
                type: {
                    kind: "BasicType",
                    name,
                    genericArgs: [],
                    pointerDepth: 0,
                    arrayDimensions: [],
                    location: { file: "internal", startLine: 0, startColumn: 0, endLine: 0, endColumn: 0 }
                } as any,
                declaration: { location: { file: "internal", startLine: 0, startColumn: 0, endLine: 0, endColumn: 0 } } as any
            });
        }
    }

    public checkProgram(program: AST.Program): void {
        // Pass 1: Hoist declarations (Structs, Functions, TypeAliases, Externs)
        for (const stmt of program.statements) {
            this.hoistDeclaration(stmt);
        }

        // Pass 2: Check bodies
        for (const stmt of program.statements) {
            this.checkStatement(stmt);
        }
    }

    private hoistDeclaration(stmt: AST.Statement): void {
        switch (stmt.kind) {
            case "StructDecl":
                this.defineSymbol(stmt.name, "Struct", undefined, stmt);
                stmt.resolvedType = {
                    kind: "BasicType",
                    name: stmt.name,
                    genericArgs: [], // TODO: Handle generics
                    pointerDepth: 0,
                    arrayDimensions: [],
                    location: stmt.location
                };
                break;
            case "FunctionDecl":
                const functionType: AST.FunctionTypeNode = {
                    kind: "FunctionType",
                    returnType: stmt.returnType,
                    paramTypes: stmt.params.map(p => p.type),
                    location: stmt.location,
                    declaration: stmt
                };
                this.defineSymbol(stmt.name, "Function", functionType, stmt);
                stmt.resolvedType = functionType;
                break;
            case "TypeAlias":
                this.defineSymbol(stmt.name, "TypeAlias", stmt.type, stmt);
                break;
            case "Extern":
                const externType: AST.FunctionTypeNode = {
                    kind: "FunctionType",
                    returnType: stmt.returnType || { kind: "BasicType", name: "void", genericArgs: [], pointerDepth: 0, arrayDimensions: [], location: stmt.location },
                    paramTypes: stmt.params.map(p => p.type),
                    location: stmt.location,
                    // declaration: stmt // ExternDecl is not FunctionDecl, but maybe we need to store it?
                };
                this.defineSymbol(stmt.name, "Function", externType, stmt);
                stmt.resolvedType = externType;
                break;
            case "Import":
                // Imports should also be hoisted or processed first
                this.checkImport(stmt);
                break;
        }
    }

    private checkStatement(stmt: AST.Statement): void {
        switch (stmt.kind) {
            case "VariableDecl": this.checkVariableDecl(stmt); break;
            case "FunctionDecl": this.checkFunctionBody(stmt); break; // Changed to check body only
            case "StructDecl": this.checkStructBody(stmt); break; // Changed to check body only
            case "TypeAlias": break; // Already hoisted
            case "Block": this.checkBlock(stmt); break;
            case "If": this.checkIf(stmt); break;
            case "Loop": this.checkLoop(stmt); break;
            case "Return": this.checkReturn(stmt); break;
            case "ExpressionStmt": this.checkExpression(stmt.expression); break;
            // ... other statements
            case "Import": break; // Already hoisted
            case "Export": break; // TODO
            case "Extern": break; // Already hoisted
            case "Asm": break; // Unsafe
            case "Break": break; // TODO: Check if inside loop
            case "Continue": break; // TODO: Check if inside loop
            case "Try": this.checkTry(stmt); break;
            case "Throw": this.checkThrow(stmt); break;
            case "Switch": this.checkSwitch(stmt); break;
        }
    }

    private checkVariableDecl(decl: AST.VariableDecl): void {
        if (Array.isArray(decl.name)) {
            // Destructuring
            for (const target of decl.name) {
                this.defineSymbol(target.name, "Variable", target.type, decl);
            }
            if (decl.initializer) {
                this.checkExpression(decl.initializer);
                // TODO: Check if initializer type matches destructuring
            }
        } else {
            // Simple declaration
            if (decl.initializer) {
                const initType = this.checkExpression(decl.initializer);
                if (decl.typeAnnotation && initType) {
                    if (!this.areTypesCompatible(decl.typeAnnotation, initType)) {
                        throw new CompilerError(
                            `Type mismatch in variable declaration: expected ${this.typeToString(decl.typeAnnotation)}, got ${this.typeToString(initType)}`,
                            `Variable '${decl.name as string}' cannot be assigned a value of incompatible type.`,
                            decl.location
                        );
                    }
                }
            }
            this.defineSymbol(decl.name as string, "Variable", decl.typeAnnotation, decl);
            // console.log(`Defined variable ${decl.name} with type ${this.typeToString(decl.typeAnnotation)}`);
            decl.resolvedType = decl.typeAnnotation;
        }
    }

    private checkFunctionBody(decl: AST.FunctionDecl, parentStruct?: AST.StructDecl): void {
        // Symbol already defined in hoist pass
        
        const previousReturnType = this.currentFunctionReturnType;
        this.currentFunctionReturnType = decl.returnType;

        this.currentScope = this.currentScope.enterScope();
        
        if (parentStruct) {
            // Define 'this'
            this.defineSymbol("this", "Parameter", {
                kind: "BasicType",
                name: parentStruct.name,
                genericArgs: parentStruct.genericParams.map(p => ({
                    kind: "BasicType",
                    name: p,
                    genericArgs: [],
                    pointerDepth: 0,
                    arrayDimensions: [],
                    location: decl.location
                })), // Forward generics? Or just use the name?
                // If struct is generic Struct<T>, inside methods 'this' is Struct<T>*.
                // But T is a type parameter.
                // We need to ensure T is available in scope.
                pointerDepth: 1,
                arrayDimensions: [],
                location: decl.location
            }, decl);
        }

        for (const param of decl.params) {
            this.defineSymbol(param.name, "Parameter", param.type, decl);
        }

        this.checkBlock(decl.body, false); // Don't create new scope, use function scope

        // Control Flow Analysis: Check if all paths return
        if (decl.returnType.kind === "BasicType" && decl.returnType.name !== "void") {
            if (!this.checkAllPathsReturn(decl.body)) {
                throw new CompilerError(
                    `Function '${decl.name}' might not return a value.`,
                    "Ensure all code paths return a value matching the return type.",
                    decl.location
                );
            }
        }

        this.currentScope = this.currentScope.exitScope();
        this.currentFunctionReturnType = previousReturnType;
    }

    private checkStructBody(decl: AST.StructDecl): void {
        // Symbol already defined in hoist pass

        if (decl.parentType) {
            if (decl.parentType.kind === "BasicType") {
                const parentSymbol = this.currentScope.resolve(decl.parentType.name);
                if (!parentSymbol) {
                    throw new CompilerError(
                        `Undefined parent struct '${decl.parentType.name}'`,
                        "Ensure the parent struct is defined before inheritance.",
                        decl.parentType.location
                    );
                }
            }
        }

        this.currentScope = this.currentScope.enterScope();
        // Add members to scope? Or Structs have their own scope resolution?
        // Usually structs define a type, and members are accessed via dot notation.
        // They don't pollute the local scope.
        // But methods inside might need to see other members?
        // For now, let's just check members.
        for (const member of decl.members) {
            if (member.kind === "FunctionDecl") {
                this.checkFunctionBody(member, decl); // Check method bodies
            } else {
                // Field
                // Check type validity
            }
        }
        this.currentScope = this.currentScope.exitScope();
    }

    private checkTypeAlias(decl: AST.TypeAliasDecl): void {
        this.defineSymbol(decl.name, "TypeAlias", decl.type, decl);
    }

    private checkImport(stmt: AST.ImportStmt): void {
        const currentFile = stmt.location.file;
        const currentDir = path.dirname(currentFile);
        const importPath = path.resolve(currentDir, stmt.source);
        
        // Check if already loaded
        let moduleScope = this.modules.get(importPath);
        
        if (!moduleScope) {
            // Load module
            if (!fs.existsSync(importPath)) {
                 throw new CompilerError(
                    `Module not found: ${importPath}`,
                    "Ensure the file exists and the path is correct.",
                    stmt.location
                );
            }
            
            const content = fs.readFileSync(importPath, "utf-8");
            const lexer = new Lexer(content, importPath);
            const tokens = lexer.scanTokens();
            const parser = new Parser(tokens);
            const ast = parser.parse();
            
            moduleScope = new SymbolTable();
            this.modules.set(importPath, moduleScope);
            this.initializeBuiltinsInScope(moduleScope);

            // Context switch
            const prevGlobal = this.globalScope;
            const prevCurrent = this.currentScope;
            
            this.globalScope = moduleScope;
            this.currentScope = moduleScope;
            
            // Hoist declarations in the imported module
            for (const s of ast.statements) {
                this.hoistDeclaration(s);
            }
            
            // Restore context
            this.globalScope = prevGlobal;
            this.currentScope = prevCurrent;
        }
        
        // Import items
        for (const item of stmt.items) {
            const symbol = moduleScope.resolve(item.name);
            if (!symbol) {
                throw new CompilerError(
                    `Module '${stmt.source}' does not export '${item.name}'`,
                    "Ensure the symbol is exported (or defined) in the module.",
                    stmt.location
                );
            }
            
            // Define in current scope
            this.defineSymbol(item.alias || item.name, symbol.kind, symbol.type, symbol.declaration);
        }
    }

    private checkExtern(decl: AST.ExternDecl): void {
        this.defineSymbol(decl.name, "Function", undefined, decl);
    }

    private checkBlock(stmt: AST.BlockStmt, newScope: boolean = true): void {
        if (newScope) this.currentScope = this.currentScope.enterScope();
        for (const s of stmt.statements) {
            this.checkStatement(s);
        }
        if (newScope) this.currentScope = this.currentScope.exitScope();
    }

    private checkIf(stmt: AST.IfStmt): void {
        this.checkExpression(stmt.condition);
        this.checkBlock(stmt.thenBranch);
        if (stmt.elseBranch) {
            if (stmt.elseBranch.kind === "Block") {
                this.checkBlock(stmt.elseBranch);
            } else if (stmt.elseBranch.kind === "If") {
                this.checkIf(stmt.elseBranch);
            }
        }
    }

    private checkLoop(stmt: AST.LoopStmt): void {
        if (stmt.condition) this.checkExpression(stmt.condition);
        this.checkBlock(stmt.body);
    }

    private checkReturn(stmt: AST.ReturnStmt): void {
        if (stmt.value) {
            const returnType = this.checkExpression(stmt.value);
            if (this.currentFunctionReturnType && returnType) {
                if (!this.areTypesCompatible(this.currentFunctionReturnType, returnType)) {
                    throw new CompilerError(
                        `Return type mismatch: expected ${this.typeToString(this.currentFunctionReturnType)}, got ${this.typeToString(returnType)}`,
                        "The return value does not match the function's declared return type.",
                        stmt.location
                    );
                }
            }
        } else {
            // No value returned
            if (this.currentFunctionReturnType && this.currentFunctionReturnType.kind === "BasicType" && this.currentFunctionReturnType.name !== "void") {
                throw new CompilerError(
                    `Missing return value: expected ${this.typeToString(this.currentFunctionReturnType)}`,
                    "Functions with non-void return types must return a value.",
                    stmt.location
                );
            }
        }
    }

    private checkTry(stmt: AST.TryStmt): void {
        this.checkBlock(stmt.tryBlock);
        for (const clause of stmt.catchClauses) {
            this.currentScope = this.currentScope.enterScope();
            this.defineSymbol(clause.variable, "Variable", clause.type, clause);
            this.checkBlock(clause.body, false);
            this.currentScope = this.currentScope.exitScope();
        }
        if (stmt.catchOther) this.checkBlock(stmt.catchOther);
    }

    private checkThrow(stmt: AST.ThrowStmt): void {
        this.checkExpression(stmt.expression);
    }

    private checkSwitch(stmt: AST.SwitchStmt): void {
        this.checkExpression(stmt.expression);
        for (const c of stmt.cases) {
            this.checkExpression(c.value);
            this.checkBlock(c.body);
        }
        if (stmt.defaultCase) this.checkBlock(stmt.defaultCase);
    }

    // --- Expressions ---

    private checkExpression(expr: AST.Expression): AST.TypeNode | undefined {
        let type: AST.TypeNode | undefined;
        switch (expr.kind) {
            case "Literal": type = this.checkLiteral(expr); break;
            case "Identifier": type = this.checkIdentifier(expr); break;
            case "Binary": type = this.checkBinary(expr); break;
            case "Unary": type = this.checkUnary(expr); break;
            case "Assignment": type = this.checkAssignment(expr); break;
            case "Call": type = this.checkCall(expr); break;
            case "Member": type = this.checkMember(expr); break;
            case "Index": type = this.checkIndex(expr); break;
            case "Ternary": type = this.checkTernary(expr); break;
            case "Cast": type = this.checkCast(expr); break;
            case "Sizeof": type = this.checkSizeof(expr); break;
            case "Match": type = this.checkMatch(expr); break;
            case "ArrayLiteral": type = this.checkArrayLiteral(expr); break;
            case "StructLiteral": type = this.checkStructLiteral(expr); break;
            case "TupleLiteral": type = this.checkTupleLiteral(expr); break;
            case "GenericInstantiation": type = this.checkGenericInstantiation(expr); break;
        }
        if (type) {
            expr.resolvedType = type;
        }
        return type;
    }

    private checkLiteral(expr: AST.LiteralExpr): AST.TypeNode {
        let name = "void";
        if (expr.type === "number") {
            // Check if it's a float or int
            if (expr.raw.includes(".") || expr.raw.includes("e") || expr.raw.includes("E")) {
                name = "float";
            } else {
                name = "int";
            }
        } else if (expr.type === "string") {
            name = "string";
        } else if (expr.type === "bool") {
            name = "bool";
        } else if (expr.type === "char") {
            name = "char";
        } else if (expr.type === "null" || expr.type === "nullptr") {
            name = "nullptr"; // Special type
        }

        return {
            kind: "BasicType",
            name,
            genericArgs: [],
            pointerDepth: 0,
            arrayDimensions: [],
            location: expr.location
        };
    }

    private checkIdentifier(expr: AST.IdentifierExpr): AST.TypeNode | undefined {
        const symbol = this.currentScope.resolve(expr.name);
        if (!symbol) {
            throw new CompilerError(
                `Undefined symbol '${expr.name}'`,
                "Ensure the variable or function is declared before use.",
                expr.location
            );
        }
        // console.log(`Resolved identifier ${expr.name} to type ${this.typeToString(symbol.type)}`);
        if (symbol.kind === "Struct") {
            return {
                kind: "MetaType",
                type: {
                    kind: "BasicType",
                    name: expr.name,
                    genericArgs: [],
                    pointerDepth: 0,
                    arrayDimensions: [],
                    location: expr.location
                },
                location: expr.location
            } as any;
        }
        return symbol.type;
    }

    private checkBinary(expr: AST.BinaryExpr): AST.TypeNode | undefined {
        const leftType = this.checkExpression(expr.left);
        const rightType = this.checkExpression(expr.right);
        
        if (!leftType || !rightType) return undefined;

        // Pointer arithmetic: ptr + int -> ptr
        if (leftType.kind === "BasicType" && leftType.pointerDepth > 0) {
            if (rightType.kind === "BasicType" && rightType.name === "int" && rightType.pointerDepth === 0) {
                return leftType;
            }
        }
        // int + ptr -> ptr
        if (rightType.kind === "BasicType" && rightType.pointerDepth > 0) {
            if (leftType.kind === "BasicType" && leftType.name === "int" && leftType.pointerDepth === 0) {
                return rightType;
            }
        }

        // TODO: Check compatibility more thoroughly
        return leftType; 
    }

    private checkUnary(expr: AST.UnaryExpr): AST.TypeNode | undefined {
        const operandType = this.checkExpression(expr.operand);
        if (!operandType) return undefined;

        if (expr.operator.type === TokenType.Star) {
            // Dereference
            if (operandType.kind === "BasicType") {
                if (operandType.pointerDepth > 0) {
                    return {
                        ...operandType,
                        pointerDepth: operandType.pointerDepth - 1
                    };
                } else {
                     throw new CompilerError(
                        `Cannot dereference non-pointer type ${this.typeToString(operandType)}`,
                        "Ensure the operand is a pointer.",
                        expr.location
                    );
                }
            }
        } else if (expr.operator.type === TokenType.Ampersand) {
            // Address of
            if (operandType.kind === "BasicType") {
                return {
                    ...operandType,
                    pointerDepth: operandType.pointerDepth + 1
                };
            }
        }
        
        return operandType;
    }

    private checkAssignment(expr: AST.AssignmentExpr): AST.TypeNode | undefined {
        const targetType = this.checkExpression(expr.assignee);
        const valueType = this.checkExpression(expr.value);
        
        if (targetType && valueType) {
            if (!this.areTypesCompatible(targetType, valueType)) {
                throw new CompilerError(
                    `Type mismatch in assignment: cannot assign ${this.typeToString(valueType)} to ${this.typeToString(targetType)}`,
                    "The assigned value is not compatible with the target variable's type.",
                    expr.location
                );
            }
        }
        return targetType;
    }

    private checkCall(expr: AST.CallExpr): AST.TypeNode | undefined {
        const calleeType = this.checkExpression(expr.callee);
        
        // Always check arguments to ensure they are valid expressions and resolve their types
        const argTypes = expr.args.map(arg => this.checkExpression(arg));

        if (calleeType && calleeType.kind === "FunctionType") {
            // Check if it's variadic (hacky check: if params empty but args exist, or if we marked it)
            // We don't have isVariadic on FunctionType.
            // But we can check the declaration if available.
            const decl = (calleeType as any).declaration; // Could be FunctionDecl or undefined (Extern)
            // ExternDecl is not stored in declaration field of FunctionTypeNode in my previous edit.
            
            // If we want to support variadic, we need to know.
            // For now, let's just check count if we have params.
            
            // If it's printf (extern), we might have 0 params in type but args provided.
            // If paramTypes is empty, maybe it's variadic or just no params.
            
            // Let's assume strict check unless we know it's variadic.
            // But I set params to [] for variadic externs.
            
            // If we have a way to know it's variadic...
            // I'll just relax the check for now if it looks like extern/variadic.
            
            if (calleeType.paramTypes.length !== expr.args.length) {
                 // If it's an extern with empty params, maybe it's variadic?
                 // But normal functions can have empty params.
                 // I need to store isVariadic in FunctionType.
            }

            for (let i = 0; i < Math.min(calleeType.paramTypes.length, expr.args.length); i++) {
                const argType = argTypes[i];
                const paramType = calleeType.paramTypes[i];
                if (argType && paramType && !this.areTypesCompatible(paramType, argType)) {
                    throw new CompilerError(
                        `Function argument type mismatch at position ${i + 1}: expected ${this.typeToString(paramType)}, got ${this.typeToString(argType)}`,
                        "The argument type does not match the parameter type.",
                        expr.args[i]!.location
                    );
                }
            }
            return calleeType.returnType;
        }
        return undefined;
    }

    private checkMember(expr: AST.MemberExpr): AST.TypeNode | undefined {
        const objectType = this.checkExpression(expr.object);

        if (objectType && objectType.kind === "MetaType") {
            const inner = (objectType as any).type;
            if (inner.kind === "BasicType") {
                const symbol = this.currentScope.resolve(inner.name);
                if (symbol && symbol.kind === "Struct") {
                    const decl = symbol.declaration as AST.StructDecl;
                    const member = decl.members.find(m => m.name === expr.property);
                    if (member) {
                        if (member.kind === "FunctionDecl") {
                            if (!member.isStatic) {
                                throw new CompilerError(
                                    `Cannot access instance member '${expr.property}' on type '${inner.name}'`,
                                    "Use an instance of the struct to access this member.",
                                    expr.location
                                );
                            }
                            const memberType: AST.FunctionTypeNode = {
                                kind: "FunctionType",
                                returnType: member.returnType,
                                paramTypes: member.params.map(p => p.type),
                                location: member.location,
                                declaration: member
                            };

                            // Substitute struct generics
                            if (decl.genericParams.length > 0 && inner.genericArgs.length === decl.genericParams.length) {
                                const mapping = new Map<string, AST.TypeNode>();
                                for (let i = 0; i < decl.genericParams.length; i++) {
                                    mapping.set(decl.genericParams[i]!, inner.genericArgs[i]!);
                                }
                                return this.substituteType(memberType, mapping);
                            }
                            return memberType;
                        }
                    }
                }
            }
        }

        if (objectType && objectType.kind === "BasicType") {
            // Handle pointer to struct (implicit dereference)
            // If pointerDepth > 0, we assume it's a pointer to the struct.
            // We don't need to change anything here because we resolve by name.
            // But we should ensure it IS a struct or pointer to struct.
            
            const symbol = this.currentScope.resolve(objectType.name);
            if (symbol && symbol.kind === "Struct" && (symbol.declaration as any).kind === "StructDecl") {
                const structDecl = symbol.declaration as AST.StructDecl;
                const member = structDecl.members.find(m => m.name === expr.property);
                if (member) {
                    if (member.kind === "StructField") {
                        // Substitute struct generics for field type
                        let fieldType = member.type;
                        if (structDecl.genericParams.length > 0 && objectType.genericArgs.length === structDecl.genericParams.length) {
                            const mapping = new Map<string, AST.TypeNode>();
                            for (let i = 0; i < structDecl.genericParams.length; i++) {
                                mapping.set(structDecl.genericParams[i]!, objectType.genericArgs[i]!);
                            }
                            fieldType = this.substituteType(fieldType, mapping);
                        }
                        return fieldType;
                    } else if (member.kind === "FunctionDecl") {
                         // Method access
                         const memberType: AST.FunctionTypeNode = {
                            kind: "FunctionType",
                            returnType: member.returnType,
                            paramTypes: member.params.map(p => p.type),
                            location: member.location,
                            declaration: member
                        };
                        
                        // Substitute struct generics
                        if (structDecl.genericParams.length > 0 && objectType.genericArgs.length === structDecl.genericParams.length) {
                            const mapping = new Map<string, AST.TypeNode>();
                            for (let i = 0; i < structDecl.genericParams.length; i++) {
                                mapping.set(structDecl.genericParams[i]!, objectType.genericArgs[i]!);
                            }
                            return this.substituteType(memberType, mapping);
                        }
                        return memberType;
                    }
                }
                // Check parent
                if (structDecl.parentType && structDecl.parentType.kind === "BasicType") {
                     // Recursive check on parent (simplified)
                     // Ideally we should resolve parent struct and check its members
                     // For now, let's just return undefined or implement recursive lookup helper
                     // TODO: Implement recursive member lookup
                }
            }
        }
        return undefined;
    }

    private checkIndex(expr: AST.IndexExpr): AST.TypeNode | undefined {
        const objectType = this.checkExpression(expr.object);
        const indexType = this.checkExpression(expr.index);

        if (!indexType || (indexType.kind === "BasicType" && indexType.name !== "int")) {
             throw new CompilerError(
                `Array index must be an integer, got ${this.typeToString(indexType)}`,
                "Ensure the index expression evaluates to an integer.",
                expr.index.location
            );
        }

        if (objectType && objectType.kind === "BasicType") {
            // Check if it's an array or pointer
            if (objectType.arrayDimensions.length > 0) {
                // It's an array, peel off one dimension
                const newDimensions = [...objectType.arrayDimensions];
                newDimensions.pop(); // Remove last dimension (or first? usually last in type def int[3][2])
                // Wait, int[3][2] usually means array of 3 arrays of 2 ints.
                // Accessing x[0] gives int[2].
                // So we remove the first dimension from the list?
                // My parser stores int[3][2] as [3, 2].
                // If I access x[i], I get the inner array.
                // So I should remove the first element.
                newDimensions.shift();
                
                return {
                    ...objectType,
                    arrayDimensions: newDimensions
                };
            } else if (objectType.pointerDepth > 0) {
                // Pointer indexing (ptr[i] is equivalent to *(ptr + i))
                // Returns the type pointed to
                return {
                    ...objectType,
                    pointerDepth: objectType.pointerDepth - 1
                };
            } else {
                 throw new CompilerError(
                    `Cannot index type ${this.typeToString(objectType)}`,
                    "Only arrays and pointers can be indexed.",
                    expr.object.location
                );
            }
        }
        return undefined;
    }

    private checkTernary(expr: AST.TernaryExpr): AST.TypeNode | undefined {
        this.checkExpression(expr.condition);
        const trueType = this.checkExpression(expr.trueExpr);
        const falseType = this.checkExpression(expr.falseExpr);
        
        if (trueType && falseType && !this.areTypesCompatible(trueType, falseType)) {
            throw new CompilerError(
                `Ternary branches have incompatible types: ${this.typeToString(trueType)} vs ${this.typeToString(falseType)}`,
                "Both branches of a ternary expression must have the same type.",
                expr.location
            );
        }
        return trueType;
    }

    private checkCast(expr: AST.CastExpr): AST.TypeNode {
        const sourceType = this.checkExpression(expr.expression);
        
        if (sourceType && !this.isCastAllowed(sourceType, expr.targetType)) {
            throw new CompilerError(
                `Unsafe cast: cannot cast ${this.typeToString(sourceType)} to ${this.typeToString(expr.targetType)}`,
                "This cast is not allowed. Check pointer depths, numeric types, or struct compatibility.",
                expr.location
            );
        }
        
        return expr.targetType;
    }

    private checkSizeof(expr: AST.SizeofExpr): AST.TypeNode {
        if ('kind' in expr.target && (expr.target.kind as string) !== 'BasicType') { // It's an expression
             this.checkExpression(expr.target as AST.Expression);
        }
        return { kind: "BasicType", name: "int", genericArgs: [], pointerDepth: 0, arrayDimensions: [], location: expr.location };
    }

    private checkMatch(expr: AST.MatchExpr): AST.TypeNode {
        if ('kind' in expr.value && (expr.value.kind as string) !== 'BasicType') {
            this.checkExpression(expr.value as AST.Expression);
        }
        return { kind: "BasicType", name: "bool", genericArgs: [], pointerDepth: 0, arrayDimensions: [], location: expr.location };
    }

    private checkArrayLiteral(expr: AST.ArrayLiteralExpr): AST.TypeNode | undefined {
        if (expr.elements.length === 0) return undefined; // Cannot infer type of empty array without context
        const firstType = this.checkExpression(expr.elements[0]!);
        for (let i = 1; i < expr.elements.length; i++) {
            this.checkExpression(expr.elements[i]!);
            // TODO: Check consistency
        }
        if (firstType && firstType.kind === "BasicType") {
             return {
                 ...firstType,
                 arrayDimensions: [...firstType.arrayDimensions, expr.elements.length] // Or just null for dynamic?
                 // For now let's say it's an array of that type.
                 // Actually arrayDimensions stores sizes.
             };
        }
        return undefined;
    }

    private checkStructLiteral(expr: AST.StructLiteralExpr): AST.TypeNode | undefined {
        const symbol = this.currentScope.resolve(expr.structName);
        if (!symbol || symbol.kind !== "Struct") {
             throw new CompilerError(
                `Unknown struct '${expr.structName}'`,
                "Ensure the struct is defined.",
                expr.location
            );
        }
        
        const decl = symbol.declaration as AST.StructDecl;
        
        for (const field of expr.fields) {
            const member = decl.members.find(m => m.name === field.name);
            if (!member || member.kind !== "StructField") {
                 throw new CompilerError(
                    `Unknown field '${field.name}' in struct '${expr.structName}'`,
                    "Check the struct definition for valid fields.",
                    field.value.location
                );
            }
            
            const valueType = this.checkExpression(field.value);
            if (valueType && !this.areTypesCompatible(member.type, valueType)) {
                 throw new CompilerError(
                    `Type mismatch for field '${field.name}': expected ${this.typeToString(member.type)}, got ${this.typeToString(valueType)}`,
                    "Field value must match the declared type.",
                    field.value.location
                );
            }
        }
        
        return {
            kind: "BasicType",
            name: expr.structName,
            genericArgs: [],
            pointerDepth: 0,
            arrayDimensions: [],
            location: expr.location
        };
    }

    private checkTupleLiteral(expr: AST.TupleLiteralExpr): AST.TypeNode {
        const types: AST.TypeNode[] = [];
        for (const el of expr.elements) {
            const t = this.checkExpression(el);
            if (t) types.push(t);
            else types.push({ kind: "BasicType", name: "unknown", genericArgs: [], pointerDepth: 0, arrayDimensions: [], location: el.location });
        }
        return {
            kind: "TupleType",
            types,
            location: expr.location
        };
    }

    private checkGenericInstantiation(expr: AST.GenericInstantiationExpr): AST.TypeNode | undefined {
        const baseType = this.checkExpression(expr.base);
        if (!baseType) return undefined;

        if (baseType.kind === "MetaType") {
            const inner = (baseType as any).type;
            if (inner.kind === "BasicType") {
                return {
                    kind: "MetaType",
                    type: {
                        ...inner,
                        genericArgs: expr.genericArgs
                    },
                    location: expr.location
                } as any;
            }
        } else if (baseType.kind === "FunctionType") {
            const decl = (baseType as any).declaration as AST.FunctionDecl;
            if (decl) {
                if (decl.genericParams.length !== expr.genericArgs.length) {
                     throw new CompilerError(
                        `Generic argument count mismatch: expected ${decl.genericParams.length}, got ${expr.genericArgs.length}`,
                        "Provide the correct number of generic arguments.",
                        expr.location
                    );
                }

                const mapping = new Map<string, AST.TypeNode>();
                for (let i = 0; i < decl.genericParams.length; i++) {
                    mapping.set(decl.genericParams[i]!, expr.genericArgs[i]!);
                }

                return this.substituteType(baseType, mapping);
            }
        }
        return baseType;
    }

    private substituteType(type: AST.TypeNode, mapping: Map<string, AST.TypeNode>): AST.TypeNode {
        if (type.kind === "BasicType") {
            if (mapping.has(type.name)) {
                const sub = mapping.get(type.name)!;
                if (sub.kind === "BasicType") {
                    return {
                        ...sub,
                        pointerDepth: sub.pointerDepth + type.pointerDepth,
                        arrayDimensions: [...sub.arrayDimensions, ...type.arrayDimensions],
                        location: type.location
                    };
                }
                if (type.pointerDepth > 0 || type.arrayDimensions.length > 0) {
                     // Fallback or error
                     return sub; 
                }
                return sub;
            }
            return {
                ...type,
                genericArgs: type.genericArgs.map(arg => this.substituteType(arg, mapping))
            };
        } else if (type.kind === "FunctionType") {
            return {
                ...type,
                returnType: this.substituteType(type.returnType, mapping),
                paramTypes: type.paramTypes.map(p => this.substituteType(p, mapping))
            };
        }
        return type;
    }

    // --- Helpers ---

    private defineSymbol(name: string, kind: SymbolKind, type: AST.TypeNode | undefined, node: AST.ASTNode): void {
        if (this.currentScope.resolve(name) && this.currentScope === this.globalScope) {
             // Allow shadowing in local scopes, but maybe warn?
             // But if defined in SAME scope, it's an error.
             // My resolve checks parent scopes too.
             // I need to check ONLY current scope for redefinition.
             // SymbolTable doesn't expose "get only current".
             // Let's assume for now we just define.
        }
        
        // Check for redefinition in current scope manually if needed, or add method to SymbolTable
        this.currentScope.define({ name, kind, type, declaration: node });
    }

    private typeToString(type: AST.TypeNode | undefined): string {
        if (!type) return "unknown";

        if (type.kind === "BasicType") {
            let result = "*".repeat(type.pointerDepth) + type.name;
            if (type.genericArgs.length > 0) {
                result += "<" + type.genericArgs.map(t => this.typeToString(t)).join(", ") + ">";
            }
            if (type.arrayDimensions.length > 0) {
                result += type.arrayDimensions.map(d => d ? `[${d}]` : "[]").join("");
            }
            return result;
        } else if (type.kind === "FunctionType") {
            const params = type.paramTypes.map(p => this.typeToString(p)).join(", ");
            return `(${params}) => ${this.typeToString(type.returnType)}`;
        } else if (type.kind === "TupleType") {
            return "(" + type.types.map(t => this.typeToString(t)).join(", ") + ")";
        }
        return "unknown";
    }

    private areTypesCompatible(t1: AST.TypeNode, t2: AST.TypeNode): boolean {
        // 1. Check basic kind
        if (t1.kind !== t2.kind) return false;

        // 2. Handle BasicType
        if (t1.kind === "BasicType" && t2.kind === "BasicType") {
            // Void handling
            if (t1.name === "void" || t2.name === "void") return false; // Cannot assign void

            // Nullptr handling
            if (t1.name === "nullptr") {
                 // nullptr is compatible with any pointer type
                 return t2.pointerDepth > 0;
            }
            if (t2.name === "nullptr") {
                return t1.pointerDepth > 0;
            }

            // Exact name match
            if (t1.name !== t2.name) {
                // TODO: Inheritance check for pointers?
                // If t1 is Parent* and t2 is Child*, it's okay.
                return false;
            }

            // Pointer depth match
            if (t1.pointerDepth !== t2.pointerDepth) return false;

            // Array dimensions match
            if (t1.arrayDimensions.length !== t2.arrayDimensions.length) return false;
            for (let i = 0; i < t1.arrayDimensions.length; i++) {
                const d1 = t1.arrayDimensions[i];
                const d2 = t2.arrayDimensions[i];
                // Allow unspecified size (null) in target to match specific size in source
                if (d1 !== null && d1 !== d2) return false;
            }

            // Generic args match
            if (t1.genericArgs.length !== t2.genericArgs.length) return false;
            for (let i = 0; i < t1.genericArgs.length; i++) {
                const g1 = t1.genericArgs[i];
                const g2 = t2.genericArgs[i];
                if (!g1 || !g2 || !this.areTypesCompatible(g1, g2)) return false;
            }

            return true;
        }

        // 3. Handle FunctionType
        if (t1.kind === "FunctionType" && t2.kind === "FunctionType") {
            if (!this.areTypesCompatible(t1.returnType, t2.returnType)) return false;
            if (t1.paramTypes.length !== t2.paramTypes.length) return false;
            for (let i = 0; i < t1.paramTypes.length; i++) {
                const p1 = t1.paramTypes[i];
                const p2 = t2.paramTypes[i];
                if (!p1 || !p2 || !this.areTypesCompatible(p1, p2)) return false;
            }
            return true;
        }
        
        // 4. TupleType
        if (t1.kind === "TupleType" && t2.kind === "TupleType") {
             if (t1.types.length !== t2.types.length) return false;
             for (let i = 0; i < t1.types.length; i++) {
                 const ty1 = t1.types[i];
                 const ty2 = t2.types[i];
                 if (!ty1 || !ty2 || !this.areTypesCompatible(ty1, ty2)) return false;
             }
             return true;
        }

        return false;
    }

    private isCastAllowed(source: AST.TypeNode, target: AST.TypeNode): boolean {
        if (this.areTypesCompatible(source, target)) return true;

        if (source.kind === "BasicType" && target.kind === "BasicType") {
            // Numeric casts
            const numeric = ["int", "float", "char", "bool"]; // bool/char treated as numeric-ish
            if (numeric.includes(source.name) && numeric.includes(target.name) && source.pointerDepth === 0 && target.pointerDepth === 0) {
                return true;
            }

            // Pointer casts
            if (source.pointerDepth > 0 && target.pointerDepth > 0) return true; // ptr -> ptr
            if (source.pointerDepth > 0 && target.name === "int") return true; // ptr -> int
            if (source.name === "int" && target.pointerDepth > 0) return true; // int -> ptr
            
            // String casts (string is effectively char*)
            if (source.name === "string" && target.pointerDepth > 0) return true;
            if (source.pointerDepth > 0 && target.name === "string") return true;
            
            // nullptr
            if (source.name === "nullptr" && target.pointerDepth > 0) return true;
        }

        return false;
    }

    private checkAllPathsReturn(stmt: AST.Statement): boolean {
        switch (stmt.kind) {
            case "Block":
                for (const s of stmt.statements) {
                    if (this.checkAllPathsReturn(s)) return true;
                }
                return false;
            case "Return":
                return true;
            case "If":
                if (stmt.elseBranch) {
                    return this.checkAllPathsReturn(stmt.thenBranch) && this.checkAllPathsReturn(stmt.elseBranch);
                }
                return false; // If without else doesn't guarantee return
            case "Loop":
                // Loops are tricky. Infinite loops technically "return" (never exit).
                // But standard analysis assumes loop might not execute or might break.
                // For now, assume loop doesn't guarantee return unless we analyze breaks.
                return false; 
            case "Switch":
                if (!stmt.defaultCase) return false; // Must have default to be exhaustive
                for (const c of stmt.cases) {
                    if (!this.checkAllPathsReturn(c.body)) return false;
                }
                return this.checkAllPathsReturn(stmt.defaultCase);
            case "Try":
                // Try block must return, AND all catch blocks must return
                // CatchOther must also return if present?
                // If catchOther is missing, exception propagates (which is a valid exit).
                // So if try returns, and all catches return, we are good.
                // Actually, if an exception is thrown, we exit the function (or go to catch).
                // If try block returns, good.
                // If try block throws, we go to catch.
                // So we need try block to return OR throw (which is handled).
                // Simplified: Try block must return. Catches must return.
                let allCatchesReturn = true;
                for (const c of stmt.catchClauses) {
                    if (!this.checkAllPathsReturn(c.body)) allCatchesReturn = false;
                }
                if (stmt.catchOther && !this.checkAllPathsReturn(stmt.catchOther)) allCatchesReturn = false;
                
                return this.checkAllPathsReturn(stmt.tryBlock) && allCatchesReturn;
            case "Throw":
                return true; // Throwing is a valid exit path (diverges)
            default:
                return false;
        }
    }
}
