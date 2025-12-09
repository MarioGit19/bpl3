import { Token } from "./Token";
import { TokenType } from "./TokenType";
import * as AST from "./AST";
import { CompilerError, type SourceLocation } from "./CompilerError";

export class Parser {
    private tokens: Token[];
    private current: number = 0;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    public parse(): AST.Program {
        const statements: AST.Statement[] = [];
        while (!this.isAtEnd()) {
            try {
                const stmt = this.declaration();
                if (stmt) statements.push(stmt);
            } catch (error) {
                if (error instanceof CompilerError) {
                    // For now, we just rethrow to stop parsing. 
                    // In a real compiler, we might synchronize and continue.
                    throw error;
                } else {
                    throw error;
                }
            }
        }

        const startToken = this.tokens[0];
        const endToken = this.previous();

        return {
            kind: "Program",
            statements,
            location: {
                file: startToken?.file || "unknown",
                startLine: startToken?.line || 0,
                startColumn: startToken?.column || 0,
                endLine: endToken?.line || 0,
                endColumn: endToken?.column || 0
            }
        };
    }

    // --- Declarations ---

    private declaration(): AST.Statement | null {
        if (this.match(TokenType.Local, TokenType.Global)) return this.variableDeclaration();
        if (this.match(TokenType.Frame, TokenType.Static)) return this.functionDeclaration();
        if (this.match(TokenType.Struct)) return this.structDeclaration();
        if (this.match(TokenType.Type)) return this.typeAliasDeclaration();
        if (this.match(TokenType.Import)) return this.importStatement();
        if (this.match(TokenType.Export)) return this.exportStatement();
        if (this.match(TokenType.Extern)) return this.externDeclaration();
        if (this.match(TokenType.Asm)) return this.asmBlock();

        return this.statement();
    }

    private variableDeclaration(): AST.VariableDecl {
        const startToken = this.previous();
        const isGlobal = startToken.type === TokenType.Global;

        // Destructuring: local (a: int, b: int) = ...
        if (this.match(TokenType.LeftParen)) {
            const targets: { name: string, type?: AST.TypeNode }[] = [];
            do {
                const name = this.consume(TokenType.Identifier, "Expected variable name.").lexeme;
                let type: AST.TypeNode | undefined;
                if (this.match(TokenType.Colon)) {
                    type = this.parseType();
                }
                targets.push({ name, type });
            } while (this.match(TokenType.Comma));
            this.consume(TokenType.RightParen, "Expected ')' after destructuring targets.");
            
            this.consume(TokenType.Equal, "Expected '=' in destructuring declaration.");
            const initializer = this.expression();
            this.consume(TokenType.Semicolon, "Expected ';' after variable declaration.");

            return {
                kind: "VariableDecl",
                isGlobal,
                name: targets,
                initializer,
                location: this.loc(startToken, this.previous())
            };
        }

        // Standard: local x: int = ...
        const name = this.consume(TokenType.Identifier, "Expected variable name.").lexeme;
        this.consume(TokenType.Colon, "Expected ':' after variable name.");
        const typeAnnotation = this.parseType();

        let initializer: AST.Expression | undefined;
        if (this.match(TokenType.Equal)) {
            initializer = this.expression();
        }

        this.consume(TokenType.Semicolon, "Expected ';' after variable declaration.");

        return {
            kind: "VariableDecl",
            isGlobal,
            name,
            typeAnnotation,
            initializer,
            location: this.loc(startToken, this.previous())
        };
    }

    private functionDeclaration(): AST.FunctionDecl {
        const startToken = this.previous();
        const isFrame = startToken.type === TokenType.Frame;
        const isStatic = startToken.type === TokenType.Static;
        const name = this.consume(TokenType.Identifier, "Expected function name.").lexeme;

        const genericParams: string[] = [];
        if (this.match(TokenType.Less)) {
            do {
                genericParams.push(this.consume(TokenType.Identifier, "Expected generic parameter name.").lexeme);
            } while (this.match(TokenType.Comma));
            this.consume(TokenType.Greater, "Expected '>' after generic parameters.");
        }

        this.consume(TokenType.LeftParen, "Expected '(' after function name.");
        const params: { name: string; type: AST.TypeNode }[] = [];
        if (!this.check(TokenType.RightParen)) {
            do {
                const paramName = this.consume(TokenType.Identifier, "Expected parameter name.").lexeme;
                this.consume(TokenType.Colon, "Expected ':' after parameter name.");
                const paramType = this.parseType();
                params.push({ name: paramName, type: paramType });
            } while (this.match(TokenType.Comma));
        }
        this.consume(TokenType.RightParen, "Expected ')' after parameters.");

        let returnType: AST.TypeNode = { 
            kind: "BasicType", name: "void", genericArgs: [], pointerDepth: 0, arrayDimensions: [], 
            location: this.loc(this.previous(), this.previous()) 
        }; // Default void? Or require it? Grammar says ReturnType?

        if (this.match(TokenType.Ret)) {
            returnType = this.parseType();
        }

        const body = this.block();

        return {
            kind: "FunctionDecl",
            isFrame,
            isStatic,
            name,
            genericParams,
            params,
            returnType,
            body,
            location: this.loc(startToken, this.previous())
        };
    }

    private structDeclaration(): AST.StructDecl {
        const startToken = this.previous();
        const name = this.consume(TokenType.Identifier, "Expected struct name.").lexeme;
        
        const genericParams: string[] = [];
        if (this.match(TokenType.Less)) {
             do {
                genericParams.push(this.consume(TokenType.Identifier, "Expected generic parameter name.").lexeme);
            } while (this.match(TokenType.Comma));
            this.consume(TokenType.Greater, "Expected '>' after generic parameters.");
        }

        let parentType: AST.TypeNode | undefined;
        if (this.match(TokenType.Colon)) {
            parentType = this.parseType();
        }

        this.consume(TokenType.LeftBrace, "Expected '{' before struct body.");
        
        const members: (AST.StructField | AST.FunctionDecl)[] = [];
        while (!this.check(TokenType.RightBrace) && !this.isAtEnd()) {
            if (this.match(TokenType.Frame, TokenType.Static)) {
                members.push(this.functionDeclaration());
            } else {
                const fieldName = this.consume(TokenType.Identifier, "Expected field name.").lexeme;
                this.consume(TokenType.Colon, "Expected ':' after field name.");
                const fieldType = this.parseType();
                this.consume(TokenType.Comma, "Expected ',' after field declaration.");
                members.push({
                    kind: "StructField",
                    name: fieldName,
                    type: fieldType,
                    location: this.loc(this.previous(), this.previous()) // Approximate
                });
            }
        }
        this.consume(TokenType.RightBrace, "Expected '}' after struct body.");

        return {
            kind: "StructDecl",
            name,
            genericParams,
            parentType,
            members,
            location: this.loc(startToken, this.previous())
        };
    }

    private typeAliasDeclaration(): AST.TypeAliasDecl {
        const startToken = this.previous();
        const name = this.consume(TokenType.Identifier, "Expected type alias name.").lexeme;
        
        const genericParams: string[] = [];
        if (this.match(TokenType.Less)) {
             do {
                genericParams.push(this.consume(TokenType.Identifier, "Expected generic parameter name.").lexeme);
            } while (this.match(TokenType.Comma));
            this.consume(TokenType.Greater, "Expected '>' after generic parameters.");
        }

        this.consume(TokenType.Equal, "Expected '=' in type alias.");
        const type = this.parseType();
        this.consume(TokenType.Semicolon, "Expected ';' after type alias.");

        return {
            kind: "TypeAlias",
            name,
            genericParams,
            type,
            location: this.loc(startToken, this.previous())
        };
    }

    private importStatement(): AST.ImportStmt {
        const startToken = this.previous();
        const items: { name: string; alias?: string }[] = [];
        
        if (this.match(TokenType.LeftBracket)) {
            do {
                const name = this.consume(TokenType.Identifier, "Expected import name.").lexeme;
                items.push({ name });
            } while (this.match(TokenType.Comma));
            this.consume(TokenType.RightBracket, "Expected ']' after import list.");
        } else {
            const name = this.consume(TokenType.Identifier, "Expected import name.").lexeme;
            items.push({ name });
        }

        this.consume(TokenType.From, "Expected 'from' after import list.");
        const source = this.consume(TokenType.StringLiteral, "Expected import source string.").lexeme; // Lexeme includes quotes? Lexer stores value in literal usually, but lexeme has quotes.
        // Assuming lexer stores raw string in lexeme including quotes.
        this.consume(TokenType.Semicolon, "Expected ';' after import.");

        return {
            kind: "Import",
            items,
            source: source.replace(/^"|"$/g, ''), // Strip quotes
            location: this.loc(startToken, this.previous())
        };
    }

    private exportStatement(): AST.ExportStmt {
        const startToken = this.previous();
        const item = this.consume(TokenType.Identifier, "Expected exported identifier.").lexeme;
        this.consume(TokenType.Semicolon, "Expected ';' after export.");
        return {
            kind: "Export",
            item,
            location: this.loc(startToken, this.previous())
        };
    }

    private externDeclaration(): AST.ExternDecl {
        const startToken = this.previous();
        const name = this.consume(TokenType.Identifier, "Expected extern function name.").lexeme;
        this.consume(TokenType.LeftParen, "Expected '(' after extern name.");
        
        const params: { name: string; type: AST.TypeNode }[] = [];
        let isVariadic = false;

        if (!this.check(TokenType.RightParen)) {
            if (this.match(TokenType.Ellipsis)) {
                isVariadic = true;
            } else {
                do {
                    if (this.match(TokenType.Ellipsis)) {
                        isVariadic = true;
                        break; // Variadic must be last
                    }
                    const paramName = this.consume(TokenType.Identifier, "Expected parameter name.").lexeme;
                    this.consume(TokenType.Colon, "Expected ':' after parameter name.");
                    const paramType = this.parseType();
                    params.push({ name: paramName, type: paramType });
                } while (this.match(TokenType.Comma));
            }
        }
        this.consume(TokenType.RightParen, "Expected ')' after extern parameters.");

        let returnType: AST.TypeNode | undefined;
        if (this.match(TokenType.Ret)) {
            returnType = this.parseType();
        }
        this.consume(TokenType.Semicolon, "Expected ';' after extern declaration.");

        return {
            kind: "Extern",
            name,
            params,
            isVariadic,
            returnType,
            location: this.loc(startToken, this.previous())
        };
    }

    private asmBlock(): AST.AsmBlockStmt {
        const startToken = this.previous();
        this.consume(TokenType.LeftBrace, "Expected '{' after asm.");
        // This is tricky because the lexer might have tokenized the asm content.
        // Ideally, the lexer should handle ASM blocks as a single token or we reconstruct it.
        // For now, let's assume we just consume tokens until '}'
        let content = "";
        while (!this.check(TokenType.RightBrace) && !this.isAtEnd()) {
            content += this.advance().lexeme + " ";
        }
        this.consume(TokenType.RightBrace, "Expected '}' after asm block.");
        
        return {
            kind: "Asm",
            content: content.trim(),
            location: this.loc(startToken, this.previous())
        };
    }

    // --- Statements ---

    private statement(): AST.Statement {
        if (this.match(TokenType.If)) return this.ifStatement();
        if (this.match(TokenType.Loop)) return this.loopStatement();
        if (this.match(TokenType.Return)) return this.returnStatement();
        if (this.match(TokenType.Break)) return this.breakStatement();
        if (this.match(TokenType.Continue)) return this.continueStatement();
        if (this.match(TokenType.LeftBrace)) return this.block();
        if (this.match(TokenType.Try)) return this.tryStatement();
        if (this.match(TokenType.Throw)) return this.throwStatement();
        if (this.match(TokenType.Switch)) return this.switchStatement();

        return this.expressionStatement();
    }

    private ifStatement(): AST.IfStmt {
        const startToken = this.previous();
        const condition = this.expression();
        const thenBranch = this.block();
        let elseBranch: AST.Statement | undefined;

        if (this.match(TokenType.Else)) {
            if (this.match(TokenType.If)) {
                elseBranch = this.ifStatement(); // else if
            } else {
                elseBranch = this.block(); // else { ... }
            }
        }

        return {
            kind: "If",
            condition,
            thenBranch,
            elseBranch,
            location: this.loc(startToken, this.previous())
        };
    }

    private loopStatement(): AST.LoopStmt {
        const startToken = this.previous();
        let condition: AST.Expression | undefined;
        
        if (!this.check(TokenType.LeftBrace)) {
            condition = this.expression();
        }
        
        const body = this.block();

        return {
            kind: "Loop",
            condition,
            body,
            location: this.loc(startToken, this.previous())
        };
    }

    private returnStatement(): AST.ReturnStmt {
        const startToken = this.previous();
        let value: AST.Expression | undefined;
        if (!this.check(TokenType.Semicolon)) {
            value = this.expression();
        }
        this.consume(TokenType.Semicolon, "Expected ';' after return value.");
        return {
            kind: "Return",
            value,
            location: this.loc(startToken, this.previous())
        };
    }

    private breakStatement(): AST.BreakStmt {
        const startToken = this.previous();
        this.consume(TokenType.Semicolon, "Expected ';' after break.");
        return { kind: "Break", location: this.loc(startToken, this.previous()) };
    }

    private continueStatement(): AST.ContinueStmt {
        const startToken = this.previous();
        this.consume(TokenType.Semicolon, "Expected ';' after continue.");
        return { kind: "Continue", location: this.loc(startToken, this.previous()) };
    }

    private block(): AST.BlockStmt {
        const startToken = this.check(TokenType.LeftBrace) ? this.consume(TokenType.LeftBrace, "Expected '{'.") : this.previous();
        const statements: AST.Statement[] = [];

        while (!this.check(TokenType.RightBrace) && !this.isAtEnd()) {
            const decl = this.declaration();
            if (decl) statements.push(decl);
        }

        this.consume(TokenType.RightBrace, "Expected '}' after block.");
        return {
            kind: "Block",
            statements,
            location: this.loc(startToken, this.previous())
        };
    }

    private tryStatement(): AST.TryStmt {
        const startToken = this.previous();
        const tryBlock = this.block();
        const catchClauses: AST.CatchClause[] = [];
        let catchOther: AST.BlockStmt | undefined;

        while (this.match(TokenType.Catch)) {
            this.consume(TokenType.LeftParen, "Expected '(' after catch.");
            const variable = this.consume(TokenType.Identifier, "Expected catch variable name.").lexeme;
            this.consume(TokenType.Colon, "Expected ':' after variable.");
            const type = this.parseType();
            this.consume(TokenType.RightParen, "Expected ')' after catch declaration.");
            const body = this.block();
            catchClauses.push({
                kind: "CatchClause",
                variable,
                type,
                body,
                location: this.loc(this.previous(), this.previous()) // Approximate
            });
        }

        if (this.match(TokenType.CatchOther)) {
            catchOther = this.block();
        }

        return {
            kind: "Try",
            tryBlock,
            catchClauses,
            catchOther,
            location: this.loc(startToken, this.previous())
        };
    }

    private throwStatement(): AST.ThrowStmt {
        const startToken = this.previous();
        const expression = this.expression();
        this.consume(TokenType.Semicolon, "Expected ';' after throw.");
        return {
            kind: "Throw",
            expression,
            location: this.loc(startToken, this.previous())
        };
    }

    private switchStatement(): AST.SwitchStmt {
        const startToken = this.previous();
        const expression = this.expression();
        this.consume(TokenType.LeftBrace, "Expected '{' after switch expression.");
        
        const cases: AST.SwitchCase[] = [];
        let defaultCase: AST.BlockStmt | undefined;

        while (!this.check(TokenType.RightBrace) && !this.isAtEnd()) {
            if (this.match(TokenType.Case)) {
                const value = this.expression();
                this.consume(TokenType.Colon, "Expected ':' after case value.");
                const body = this.block();
                cases.push({
                    kind: "Case",
                    value,
                    body,
                    location: this.loc(this.previous(), this.previous()) // Approximate
                });
            } else if (this.match(TokenType.Default)) {
                this.consume(TokenType.Colon, "Expected ':' after default.");
                defaultCase = this.block();
            } else {
                throw this.error(this.peek(), "Expected 'case' or 'default' inside switch.");
            }
        }
        this.consume(TokenType.RightBrace, "Expected '}' after switch body.");

        return {
            kind: "Switch",
            expression,
            cases,
            defaultCase,
            location: this.loc(startToken, this.previous())
        };
    }

    private expressionStatement(): AST.ExpressionStmt {
        const expr = this.expression();
        this.consume(TokenType.Semicolon, "Expected ';' after expression.");
        return {
            kind: "ExpressionStmt",
            expression: expr,
            location: expr.location
        };
    }

    // --- Expressions ---

    private expression(): AST.Expression {
        return this.assignment();
    }

    private assignment(): AST.Expression {
        const expr = this.ternary();

        if (this.match(TokenType.Equal, TokenType.PlusEqual, TokenType.MinusEqual, TokenType.StarEqual, TokenType.SlashEqual, TokenType.PercentEqual, TokenType.AmpersandEqual, TokenType.PipeEqual, TokenType.CaretEqual)) {
            const operator = this.previous();
            const value = this.assignment();

            return {
                kind: "Assignment",
                assignee: expr,
                operator,
                value,
                location: this.loc(expr.location, value.location)
            };
        }

        return expr;
    }

    private ternary(): AST.Expression {
        let expr = this.or();

        if (this.match(TokenType.Question)) {
            const trueExpr = this.ternary();
            this.consume(TokenType.Colon, "Expected ':' in ternary operator.");
            const falseExpr = this.ternary();
            return {
                kind: "Ternary",
                condition: expr,
                trueExpr,
                falseExpr,
                location: this.loc(expr.location, falseExpr.location)
            };
        }

        return expr;
    }

    private or(): AST.Expression {
        let expr = this.and();
        while (this.match(TokenType.OrOr)) {
            const operator = this.previous();
            const right = this.and();
            expr = { kind: "Binary", left: expr, operator, right, location: this.loc(expr.location, right.location) };
        }
        return expr;
    }

    private and(): AST.Expression {
        let expr = this.bitwiseOr();
        while (this.match(TokenType.AndAnd)) {
            const operator = this.previous();
            const right = this.bitwiseOr();
            expr = { kind: "Binary", left: expr, operator, right, location: this.loc(expr.location, right.location) };
        }
        return expr;
    }

    private bitwiseOr(): AST.Expression {
        let expr = this.bitwiseXor();
        while (this.match(TokenType.Pipe)) {
            const operator = this.previous();
            const right = this.bitwiseXor();
            expr = { kind: "Binary", left: expr, operator, right, location: this.loc(expr.location, right.location) };
        }
        return expr;
    }

    private bitwiseXor(): AST.Expression {
        let expr = this.bitwiseAnd();
        while (this.match(TokenType.Caret)) {
            const operator = this.previous();
            const right = this.bitwiseAnd();
            expr = { kind: "Binary", left: expr, operator, right, location: this.loc(expr.location, right.location) };
        }
        return expr;
    }

    private bitwiseAnd(): AST.Expression {
        let expr = this.equality();
        while (this.match(TokenType.Ampersand)) {
            const operator = this.previous();
            const right = this.equality();
            expr = { kind: "Binary", left: expr, operator, right, location: this.loc(expr.location, right.location) };
        }
        return expr;
    }

    private equality(): AST.Expression {
        let expr = this.relational();
        while (this.match(TokenType.BangEqual, TokenType.EqualEqual)) {
            const operator = this.previous();
            const right = this.relational();
            expr = { kind: "Binary", left: expr, operator, right, location: this.loc(expr.location, right.location) };
        }
        return expr;
    }

    private relational(): AST.Expression {
        let expr = this.shift();
        while (this.match(TokenType.Greater, TokenType.GreaterEqual, TokenType.Less, TokenType.LessEqual)) {
            const operator = this.previous();
            const right = this.shift();
            expr = { kind: "Binary", left: expr, operator, right, location: this.loc(expr.location, right.location) };
        }
        return expr;
    }

    private shift(): AST.Expression {
        let expr = this.additive();
        while (this.match(TokenType.LessLess, TokenType.GreaterGreater)) {
            const operator = this.previous();
            const right = this.additive();
            expr = { kind: "Binary", left: expr, operator, right, location: this.loc(expr.location, right.location) };
        }
        return expr;
    }

    private additive(): AST.Expression {
        let expr = this.multiplicative();
        while (this.match(TokenType.Minus, TokenType.Plus)) {
            const operator = this.previous();
            const right = this.multiplicative();
            expr = { kind: "Binary", left: expr, operator, right, location: this.loc(expr.location, right.location) };
        }
        return expr;
    }

    private multiplicative(): AST.Expression {
        let expr = this.unary();
        while (this.match(TokenType.Slash, TokenType.Star, TokenType.Percent)) {
            const operator = this.previous();
            const right = this.unary();
            expr = { kind: "Binary", left: expr, operator, right, location: this.loc(expr.location, right.location) };
        }
        return expr;
    }

    private unary(): AST.Expression {
        if (this.match(TokenType.Bang, TokenType.Minus, TokenType.Tilde, TokenType.Star, TokenType.Ampersand, TokenType.PlusPlus, TokenType.MinusMinus)) {
            const operator = this.previous();
            const right = this.unary();
            return { kind: "Unary", operator, operand: right, isPrefix: true, location: this.loc(operator, right.location) };
        }
        return this.postfix();
    }

    private postfix(): AST.Expression {
        let expr = this.primary();

        while (true) {
            if (this.isGenericInstantiation()) {
                this.consume(TokenType.Less, "Expected '<'.");
                const genericArgs: AST.TypeNode[] = [];
                do {
                    genericArgs.push(this.parseType());
                } while (this.match(TokenType.Comma));

                if (this.check(TokenType.GreaterGreater)) {
                    const token = this.peek();
                    token.type = TokenType.Greater;
                    this.tokens.splice(this.current + 1, 0, {
                        ...token,
                        type: TokenType.Greater,
                        lexeme: ">"
                    } as any);
                }

                this.consume(TokenType.Greater, "Expected '>' after generic arguments.");

                expr = {
                    kind: "GenericInstantiation",
                    base: expr,
                    genericArgs,
                    location: this.loc(expr.location, this.previous())
                };
            } else if (this.match(TokenType.LeftParen)) {
                // Function call
                const args: AST.Expression[] = [];
                if (!this.check(TokenType.RightParen)) {
                    do {
                        args.push(this.expression());
                    } while (this.match(TokenType.Comma));
                }
                this.consume(TokenType.RightParen, "Expected ')' after arguments.");
                expr = { kind: "Call", callee: expr, args, genericArgs: [], location: this.loc(expr.location, this.previous()) };
            } else if (this.match(TokenType.LeftBracket)) {
                // Indexing
                const index = this.expression();
                this.consume(TokenType.RightBracket, "Expected ']' after index.");
                expr = { kind: "Index", object: expr, index, location: this.loc(expr.location, this.previous()) };
            } else if (this.match(TokenType.Dot)) {
                // Member access
                const name = this.consume(TokenType.Identifier, "Expected property name after '.'.").lexeme;
                expr = { kind: "Member", object: expr, property: name, location: this.loc(expr.location, this.previous()) };
            } else if (this.match(TokenType.LeftBrace)) {
                // Struct Literal: Point { x: 1 }
                if (expr.kind !== "Identifier") {
                     throw this.error(this.previous(), "Expected struct name before '{'.");
                }
                const structName = (expr as AST.IdentifierExpr).name;
                const fields: { name: string; value: AST.Expression }[] = [];
                
                if (!this.check(TokenType.RightBrace)) {
                    do {
                        const name = this.consume(TokenType.Identifier, "Expected field name.").lexeme;
                        this.consume(TokenType.Colon, "Expected ':' after field name.");
                        const value = this.expression();
                        fields.push({ name, value });
                    } while (this.match(TokenType.Comma));
                }
                this.consume(TokenType.RightBrace, "Expected '}' after struct fields.");
                
                expr = {
                    kind: "StructLiteral",
                    structName,
                    fields,
                    location: this.loc(expr.location, this.previous())
                };
            } else {
                break;
            }
        }

        return expr;
    }

    private primary(): AST.Expression {
        if (this.match(TokenType.False)) return { kind: "Literal", value: false, raw: "false", type: "bool", location: this.loc(this.previous(), this.previous()) };
        if (this.match(TokenType.True)) return { kind: "Literal", value: true, raw: "true", type: "bool", location: this.loc(this.previous(), this.previous()) };
        if (this.match(TokenType.Null)) return { kind: "Literal", value: null, raw: "null", type: "null", location: this.loc(this.previous(), this.previous()) };
        if (this.match(TokenType.Nullptr)) return { kind: "Literal", value: null, raw: "nullptr", type: "nullptr", location: this.loc(this.previous(), this.previous()) };

        if (this.match(TokenType.NumberLiteral)) {
            return { kind: "Literal", value: this.previous().literal, raw: this.previous().lexeme, type: "number", location: this.loc(this.previous(), this.previous()) };
        }
        if (this.match(TokenType.StringLiteral)) {
            return { kind: "Literal", value: this.previous().literal, raw: this.previous().lexeme, type: "string", location: this.loc(this.previous(), this.previous()) };
        }
        if (this.match(TokenType.CharLiteral)) {
            return { kind: "Literal", value: this.previous().literal, raw: this.previous().lexeme, type: "char", location: this.loc(this.previous(), this.previous()) };
        }

        if (this.match(TokenType.Identifier)) {
            return { kind: "Identifier", name: this.previous().lexeme, location: this.loc(this.previous(), this.previous()) };
        }

        if (this.match(TokenType.LeftParen)) {
            const expr = this.expression();
            this.consume(TokenType.RightParen, "Expected ')' after expression.");
            return expr; // Or wrap in GroupingExpr if needed
        }

        if (this.match(TokenType.Cast)) {
            const start = this.previous();
            this.consume(TokenType.Less, "Expected '<' after cast.");
            const type = this.parseType();
            this.consume(TokenType.Greater, "Expected '>' after cast type.");
            this.consume(TokenType.LeftParen, "Expected '(' after cast type.");
            const expr = this.expression();
            this.consume(TokenType.RightParen, "Expected ')' after cast expression.");
            return { kind: "Cast", targetType: type, expression: expr, location: this.loc(start, this.previous()) };
        }

        if (this.match(TokenType.Sizeof)) {
            const start = this.previous();
            if (this.match(TokenType.Less)) {
                const type = this.parseType();
                this.consume(TokenType.Greater, "Expected '>' after sizeof type.");
                this.consume(TokenType.LeftParen, "Expected '(' after sizeof."); // Grammar says sizeof <T> ()
                this.consume(TokenType.RightParen, "Expected ')' after sizeof.");
                return { kind: "Sizeof", target: type, location: this.loc(start, this.previous()) };
            } else {
                this.consume(TokenType.LeftParen, "Expected '(' after sizeof.");
                const expr = this.expression();
                this.consume(TokenType.RightParen, "Expected ')' after sizeof expression.");
                return { kind: "Sizeof", target: expr, location: this.loc(start, this.previous()) };
            }
        }

        if (this.match(TokenType.Match)) {
             const start = this.previous();
             this.consume(TokenType.Less, "Expected '<' after match.");
             const type = this.parseType();
             this.consume(TokenType.Greater, "Expected '>' after match type.");
             this.consume(TokenType.LeftParen, "Expected '(' after match.");
             // Argument can be Expression or Type. This is ambiguous.
             // We'll try to parse as expression first. If it fails or looks like a type start, we parse type.
             // But types start with Identifier or Func or *. Expressions start with Identifier or Literal etc.
             // Identifier is the conflict.
             // Simple heuristic: if it parses as expression, good.
             // Actually, `match<T>(int)` -> `int` is a type. `match<T>(x)` -> `x` is expr.
             // Let's try to parse as Type if the next token suggests a type (Func, *, or known type keyword if we had them).
             // Since types are mostly identifiers, we might need lookahead or backtracking.
             // For now, let's assume Expression covers Identifier. If we want to support `match<T>(int)`, `int` is an identifier expression.
             // We can resolve this in semantic analysis phase.
             const expr = this.expression();
             this.consume(TokenType.RightParen, "Expected ')' after match argument.");
             return { kind: "Match", targetType: type, value: expr, location: this.loc(start, this.previous()) };
        }

        if (this.match(TokenType.LeftBracket)) {
            const start = this.previous();
            const elements: AST.Expression[] = [];
            if (!this.check(TokenType.RightBracket)) {
                do {
                    elements.push(this.expression());
                } while (this.match(TokenType.Comma));
            }
            this.consume(TokenType.RightBracket, "Expected ']' after array elements.");
            return { kind: "ArrayLiteral", elements, location: this.loc(start, this.previous()) };
        }

        throw this.error(this.peek(), "Expected expression.");
    }

    // --- Types ---

    private parseType(): AST.TypeNode {
        const startToken = this.peek();

        // Function Type: Func<Ret>(Args...)
        if (this.match(TokenType.Func)) {
            this.consume(TokenType.Less, "Expected '<' after Func.");
            const returnType = this.parseType();
            this.consume(TokenType.Greater, "Expected '>' after return type.");
            this.consume(TokenType.LeftParen, "Expected '(' for function arguments.");
            const paramTypes: AST.TypeNode[] = [];
            if (!this.check(TokenType.RightParen)) {
                do {
                    paramTypes.push(this.parseType());
                } while (this.match(TokenType.Comma));
            }
            this.consume(TokenType.RightParen, "Expected ')' after function arguments.");
            return {
                kind: "FunctionType",
                returnType,
                paramTypes,
                location: this.loc(startToken, this.previous())
            };
        }

        // Tuple Type: (int, bool)
        if (this.match(TokenType.LeftParen)) {
            const types: AST.TypeNode[] = [];
            do {
                types.push(this.parseType());
            } while (this.match(TokenType.Comma));
            this.consume(TokenType.RightParen, "Expected ')' after tuple types.");
            return {
                kind: "TupleType",
                types,
                location: this.loc(startToken, this.previous())
            };
        }

        // Basic Type: *int[]
        let pointerDepth = 0;
        while (this.match(TokenType.Star)) {
            pointerDepth++;
        }

        const nameToken = this.consume(TokenType.Identifier, "Expected type name.");
        const name = nameToken.lexeme;
        const genericArgs: AST.TypeNode[] = [];

        if (this.match(TokenType.Less)) {
            do {
                genericArgs.push(this.parseType());
            } while (this.match(TokenType.Comma));
            
            // Handle nested generics closing with >>
            if (this.check(TokenType.GreaterGreater)) {
                // Split >> into > and >
                // We consume the >> token but pretend we only consumed one >
                // This is tricky. Better to change the token type of the current token?
                // Or just consume it and push a new > token back?
                // Recursive descent parsers usually look ahead.
                
                // Strategy: If we see >>, we treat it as closing the current generic arg list
                // AND the parent one.
                // But here we are inside one parseType call.
                // If we are at the end of `Box<Box<int>>`, the inner parseType sees `>>`.
                // It should consume one `>` and leave the other for the outer parseType.
                
                // Let's modify the token stream in place?
                const token = this.peek();
                token.type = TokenType.Greater;
                // We need to insert another Greater token after this one
                this.tokens.splice(this.current + 1, 0, {
                    ...token,
                    type: TokenType.Greater,
                    lexeme: ">"
                } as any); // Hacky but works for simple array of tokens
                
                this.consume(TokenType.Greater, "Expected '>' after generic arguments.");
            } else {
                this.consume(TokenType.Greater, "Expected '>' after generic arguments.");
            }
        }

        const arrayDimensions: (number | null)[] = [];
        while (this.match(TokenType.LeftBracket)) {
            if (this.match(TokenType.NumberLiteral)) {
                arrayDimensions.push(this.previous().literal);
            } else {
                arrayDimensions.push(null);
            }
            this.consume(TokenType.RightBracket, "Expected ']' after array dimension.");
        }

        return {
            kind: "BasicType",
            name,
            genericArgs,
            pointerDepth,
            arrayDimensions,
            location: this.loc(startToken, this.previous())
        };
    }

    // --- Helpers ---

    private match(...types: TokenType[]): boolean {
        for (const type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }

    private check(type: TokenType): boolean {
        if (this.isAtEnd()) return false;
        return this.peek().type === type;
    }

    private advance(): Token {
        if (!this.isAtEnd()) this.current++;
        return this.previous();
    }

    private isAtEnd(): boolean {
        return this.peek().type === TokenType.EOF;
    }

    private peek(): Token {
        return this.tokens[this.current]!;
    }

    private previous(): Token {
        return this.tokens[this.current - 1]!;
    }

    private consume(type: TokenType, message: string): Token {
        if (this.check(type)) return this.advance();
        throw this.error(this.peek(), message);
    }

    private error(token: Token, message: string): CompilerError {
        return new CompilerError(
            `Parse Error: ${message}`,
            `Unexpected token '${token.lexeme}'`,
            {
                file: token.file,
                startLine: token.line,
                startColumn: token.column,
                endLine: token.line,
                endColumn: token.column + token.lexeme.length
            }
        );
    }

    private loc(start: Token | SourceLocation, end: Token | SourceLocation): SourceLocation {
        let startFile: string, startLine: number, startColumn: number;
        let endLine: number, endColumn: number;

        if (start instanceof Token) {
            startFile = start.file;
            startLine = start.line;
            startColumn = start.column;
        } else {
            startFile = start.file;
            startLine = start.startLine;
            startColumn = start.startColumn;
        }

        if (end instanceof Token) {
            endLine = end.line;
            endColumn = end.column + (end.lexeme?.length || 0);
        } else {
            endLine = end.endLine;
            endColumn = end.endColumn;
        }
        
        return {
            file: startFile,
            startLine: startLine,
            startColumn: startColumn,
            endLine: endLine,
            endColumn: endColumn
        };
    }

    private isGenericInstantiation(): boolean {
        if (!this.check(TokenType.Less)) return false;
        let depth = 0;
        let i = this.current + 1; // Skip <
        while (i < this.tokens.length) {
            const t = this.tokens[i];
            if (!t) break;
            
            if (t.type === TokenType.Greater) {
                if (depth === 0) {
                    // Found closing >
                    // Check if next token is ( or . or ) or ,
                    const next = this.tokens[i+1];
                    return !!(next && (next.type === TokenType.LeftParen || next.type === TokenType.Dot || next.type === TokenType.RightParen || next.type === TokenType.Comma));
                }
                depth--;
            } else if (t.type === TokenType.Less) {
                depth++;
            } else if (t.type === TokenType.GreaterGreater) {
                 if (depth === 1) {
                     // Closes inner and outer
                     const next = this.tokens[i+1];
                     return !!(next && (next.type === TokenType.LeftParen || next.type === TokenType.Dot || next.type === TokenType.RightParen || next.type === TokenType.Comma));
                 }
                 depth -= 2;
            } else if (t.type === TokenType.Semicolon || t.type === TokenType.RightBrace || t.type === TokenType.RightParen || t.type === TokenType.Equal) {
                // Abort at statement boundaries or assignment
                return false;
            }
            
            if (depth < 0) {
                 return false;
            }
            i++;
        }
        return false;
    }
}
