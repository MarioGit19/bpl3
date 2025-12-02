# Compiler Internals

This document describes the internal architecture of the BPL compiler. It is intended for contributors who want to understand how the compiler works or add new features.

## Architecture Overview

The BPL compiler follows a standard multi-pass architecture:

1.  **Lexical Analysis (Lexer)**: Converts source code into a stream of tokens.
2.  **Parsing (Parser)**: Converts the stream of tokens into an Abstract Syntax Tree (AST).
3.  **Transpilation (Transpiler)**: Traverses the AST and generates x86-64 assembly code.
4.  **Optimization**: Optimizes the generated assembly code.

## 1. Lexer (`lexer/`)

The lexer (`lexer.ts`) reads the source code character by character and groups them into tokens (`token.ts`).

- **Tokens**: Represent atomic units like keywords (`frame`, `if`), identifiers (`myVar`), literals (`123`, `"hello"`), and operators (`+`, `=`).
- **TokenType**: An enum defining all possible token types.

## 2. Parser (`parser/`)

The parser (`parser.ts`) uses a recursive descent approach to build the AST.

- **Expressions**: All AST nodes inherit from the `Expr` class (`expression/expr.ts`).
- **Structure**: The AST reflects the hierarchical structure of the program (e.g., a `ProgramExpr` contains a list of `FunctionDeclaration`s).

### Key AST Nodes:

- `FunctionDeclaration`: Represents a `frame`.
- `VariableDeclarationExpr`: Represents `local` or `global` variables.
- `BinaryExpr`: Represents operations like `a + b`.
- `IfExpr`, `LoopExpr`: Control flow structures.

## 3. Transpiler (`transpiler/`)

The transpiler is responsible for generating LLVM IR from the AST.

- **`IRGenerator.ts`**: A helper class for generating LLVM IR.
- **`Scope.ts`**: Manages variable scopes (global vs. local), symbol tables, and type information.
- **`toIR()` method**: Each AST node implements a `toIR(gen: IRGenerator, scope: Scope)` method that emits the corresponding LLVM IR.

### Stack Management

BPL uses the stack for local variables, managed by LLVM's `alloca` instruction.

## 4. Optimizer

The compiler relies on LLVM's powerful optimization pipeline (e.g., `opt` and `clang -O3`).

## 5. Type System

BPL is statically typed. Types are tracked in the `Scope`. Types are more type hints than strict types.

- **Primitive Types**: `u8`, `u64`, etc.
- **Pointers**: Represented by `isPointer` flag or wrapper types.
- **Structs**: User-defined types stored in the scope.
- **Arrays**: Fixed-size arrays.

## Adding a New Feature

To add a new feature (e.g., a new loop type):

1.  **Lexer**: Add new keywords/tokens if necessary.
2.  **Parser**: Create a new AST node class (e.g., `ForLoopExpr`) and update the parser to recognize the syntax.
3.  **Transpiler**: Implement the `toIR` method for the new AST node to generate the correct LLVM IR.
4.  **Tests**: Add unit tests and integration tests.
