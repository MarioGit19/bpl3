# BPL3 Compiler Architecture

## Project Structure

The BPL3 compiler follows a traditional three-phase compiler architecture:

```
compiler/
├── frontend/       # Lexical and Syntax Analysis
│   ├── Lexer.ts    # Tokenization
│   ├── Parser.ts   # AST construction
│   ├── Token.ts    # Token representation
│   └── TokenType.ts # Token type definitions
│
├── middleend/      # Semantic Analysis
│   ├── TypeChecker.ts  # Type checking and validation
│   └── SymbolTable.ts  # Symbol table management
│
├── backend/        # Code Generation
│   └── CodeGenerator.ts # LLVM IR generation
│
├── common/         # Shared Components
│   ├── AST.ts           # Abstract Syntax Tree definitions
│   ├── CompilerError.ts # Error handling
│   └── ASTPrinter.ts    # AST pretty printing
│
└── index.ts        # Compiler API exports
```

## Compilation Pipeline

### 1. Frontend Phase

**Lexical Analysis (Lexer)**

- Converts source code into a stream of tokens
- Handles keywords, identifiers, literals, operators
- Reports lexical errors (invalid characters, unterminated strings)

**Syntax Analysis (Parser)**

- Constructs an Abstract Syntax Tree (AST) from tokens
- Validates program structure against grammar rules
- Reports syntax errors with location information

### 2. Middleend Phase

**Semantic Analysis (TypeChecker)**

- Validates type correctness throughout the program
- Resolves type aliases and generic instantiations
- Checks function signatures, variable declarations
- Validates control flow (return statements, unreachable code)
- Manages symbol tables and scopes
- Handles module imports and exports

### 3. Backend Phase

**Code Generation (CodeGenerator)**

- Translates AST to LLVM IR (Intermediate Representation)
- Manages memory layout for structs and arrays
- Handles function calls and parameter passing
- Generates code for expressions, statements, control flow
- Supports variadic functions (printf, etc.)

## LLVM Integration

### LLVM Version

- **Target LLVM Version**: LLVM 10.0+ (compatible with most modern systems)
- **IR Format**: LLVM IR text format (.ll files)
- **Execution**: Uses `lli` (LLVM interpreter) for immediate execution
- **Compilation**: Can be compiled to native code using `llc` or `clang`

### LLVM IR Generation

The compiler generates textual LLVM IR that can be:

1. Interpreted directly with `lli`
2. Compiled to object files with `llc`
3. Linked and compiled with `clang`
4. Optimized with `opt`

Example workflow:

```bash
# Compile BPL to LLVM IR
bun index.ts program.bpl

# Run with LLVM interpreter
lli program.ll

# Compile to native executable
llc program.ll -o program.s
clang program.s -o program
./program
```

## Type System

### Canonical Types

- **Integers**: `i1` (bool), `i8`, `i16`, `i32`, `i64` (signed)
- **Unsigned**: `u8`, `u16`, `u32`, `u64`
- **Floating Point**: `double` (64-bit IEEE 754)
- **Pointers**: Any type + `*` (e.g., `i32*`, `MyStruct*`)
- **Arrays**: Type + dimensions (e.g., `i32[10]`, `double[5][3]`)

### Type Aliases

Built-in aliases for convenience:

- `int` → `i32`
- `uint` → `u32`
- `long` → `i64`
- `ulong` → `u64`
- `short` → `i16`
- `ushort` → `u16`
- `char` → `i8`
- `uchar` → `u8`
- `bool` → `i1`
- `float` → `double`

Custom type aliases can be defined:

```bpl
type UserID = int;
type Point3D = Point;
```

## Features

### Completed

- ✅ Full type system with generics
- ✅ Struct types with inheritance
- ✅ Methods (instance and static)
- ✅ Type casting (implicit and explicit)
- ✅ Control flow (if/else, loops, switch)
- ✅ Exception handling (try/catch/throw)
- ✅ Module system (import/export)
- ✅ Type aliases (user-defined)
- ✅ Variadic functions
- ✅ LLVM IR code generation

### In Progress

- 🚧 Advanced generics (constraints, inference)
- 🚧 Function overloading
- 🚧 Operator overloading
- 🚧 Standard library expansion

## Development

### Building

```bash
bun install
```

### Running Tests

```bash
bun test
```

### Compiling a Program

```bash
# Using the wrapper script
./cmp.sh examples/hello-world/main.bpl

# Using the compiler directly
bun index.ts examples/hello-world/main.bpl
lli examples/hello-world/main.ll
```

### Debugging

```bash
# Emit tokens
bun index.ts program.bpl --emit tokens

# Emit AST
bun index.ts program.bpl --emit ast

# Emit LLVM IR (default)
bun index.ts program.bpl --emit llvm

# Verbose mode
bun index.ts program.bpl -v
```

## Contributing

When adding new features:

1. **Frontend changes**: Add to `compiler/frontend/` (Lexer/Parser)
2. **Type system changes**: Modify `compiler/middleend/TypeChecker.ts`
3. **Code generation**: Update `compiler/backend/CodeGenerator.ts`
4. **AST changes**: Edit `compiler/common/AST.ts` and update all phases
5. **Add tests**: Create tests in `tests/` directory
6. **Update docs**: Keep this README and TODO.md current

## References

- [LLVM Language Reference](https://llvm.org/docs/LangRef.html)
- [LLVM IR Tutorial](https://llvm.org/docs/tutorial/)
- Language Specification: See `LANGUAGE_SPEC.md`
- Grammar: See `grammar/grammar.bpl`
