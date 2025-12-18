# BPL3 Compiler Progress

- Number inside brackets indicates priority (lower number = higher priority), x indicates completed features.

## Completed Features

- [x] Advanced Generics (Constraints, Inference)
- [x] Strict Type Compatibility Checking
- [x] Inheritance Support (Structs)
- [x] Generics Parsing Fix (`>>` operator)
- [x] Control Flow Analysis (Missing Return Check)
- [x] Declaration Hoisting (Two-pass compilation)
- [x] Array Indexing Type Resolution
- [x] Method `this` Support
- [x] Module System (Imports)
- [x] Nested Generics & Static Methods
- [x] Generic Instantiation in Expressions
- [x] Make `this` explicit in struct methods
- [x] Code Generation (LLVM IR or similar)
- [x] Canonical primitive integer types mapping
- [x] Type casting (implicit & explicit)
- [x] CLI compiler tool
- [x] Unit & integration tests (basic coverage exists)
- [x] Try/catch error handling (already implemented)
- [x] Type Aliasing (user-defined type aliases)
- [x] Project structure & LLVM upgrade
- [x] Full import resolution before compilation
- [x] Per-module compilation and linking with cache
- [x] Replace lli with clang for running LLVM IR
- [x] Add default exit code for main if it's void
- [x] Packaging system for libraries/apps (init, pack, install, list commands)
- [x] Constructors and destructors for structs
- [x] Monomorphization for Generic Structs (Basic Support)
- [x] Code formatter
- [x] Error handling and diagnostics
- [x] AST/IR printing flags (CLI `--emit` option)
- [x] Language Specification Update
- [x] VS Code Extension
- [x] Language Server Protocol (LSP) Implementation
- [x] Robust Import/Export & Linking
- [x] Function Overloading by Parameter Types
- [x] Standard Library Module
- [x] Interfaces/Traits
- [x] Enhanced Error Messages with Location Information
- [x] Shell Autocomplete for CLI
- [x] Operator Overloading for User Types (24 operators: arithmetic, bitwise, comparison, unary, indexing, callable)

## Pending Features (expanded)

- Implementation notes: Define mapping between operators and method names; during type-checking, if an operand type has the corresponding method, resolve to that method; otherwise fall back to builtin semantics. Disallow assignment operators overloading. Ensure overload resolution supports left/right operand dispatch and coercions.
- Acceptance criteria: Defining `__add__` on a struct causes `a + b` to call that method; operator resolution respects type conversions and produces helpful errors when ambiguous.

- [2] Enum Types and Pattern Matching
  - Description: Implement enum types (including tagged unions) with exhaustive pattern matching support.
  - Implementation notes: Add enum syntax, implement tag-based value storage, add match expression with exhaustiveness checking.
  - Acceptance criteria: Enums compile and match expressions validate all cases are handled; errors on non-exhaustive patterns.

- [3] Root Global `Type` Struct
  - Description: Define a root `Type` struct that every user-defined struct implicitly inherits from, providing methods like `getTypeName()`, `getSize()`, `toString()`, and basic equality.
  - Implementation notes: Add injection of implicit base for every struct during parsing/semantic analysis. Implement common methods as part of the runtime/stdlib. Ensure virtual dispatch works (method overriding) if language supports it.
  - Acceptance criteria: Any struct can call `getTypeName()`; common operations are available without explicit inheritance in source.

- [3] Primitive Types as Structs Inheriting `Primitive`
  - Description: Model primitive types (int, float, bool, char) as structs inheriting from a `Primitive` base, exposing operations as methods to unify the type system.
  - Implementation notes: Represent primitives specially in the type system but provide method dispatch wrappers so code like `int_val.toString()` is valid. Balance performance (inlined primitives) with uniformity (object-like methods).
  - Acceptance criteria: Primitive methods are callable and interoperate with language operators; performance-sensitive paths remain efficient.

- [3] Multi-Target Support
  - Description: Add support for targeting multiple platforms and architectures (x86/x64/ARM) and provide conditional std lib methods for platform differences.
  - Implementation notes: Abstract target-specific codegen paths and provide a target triple input. Maintain a small set of runtime abstractions for syscalls/ABI.
  - Acceptance criteria: Codegen can emit different target outputs and small example programs run on at least two targets.

- [4] Closures and Lambda Expressions
  - Description: Implement anonymous functions with capture of local variables from enclosing scope.
  - Implementation notes: Add lambda syntax (e.g., `|x, y| x + y`), analyze captured variables, generate closure structs, support passing closures as function arguments.
  - Acceptance criteria: Lambdas capture variables correctly, can be passed to higher-order functions, captured variables have correct lifetime.

- [4] Enhanced Error Messages with Location Information
  - Description: Improve all compiler error messages to include precise file:row:column location information and contextual details for faster debugging.
  - Implementation notes: Ensure all errors capture source location (file path, line number, column), add code snippets showing the error location, include suggestions or hints where applicable, support colorized output for terminals.
  - Acceptance criteria: Every error message includes file:row:column format, error output includes code snippet with visual indicator of problem location, related errors are grouped, suggestions guide users to fixes.

- [5] Type Narrowing / Pattern Matching
  - Description: Implement syntax and semantics for narrowing variable types based on runtime checks (useful inside `catch` blocks or generic contexts).
  - Implementation notes: Add a `match<T>(expr)` AST construct and TypeChecker rules to narrow variable types inside block scope. Ensure RTTI support for runtime checks.
  - Acceptance criteria: Within a `match<T>(v)` block, `v` has type `T` and member accesses/overloads resolve accordingly.

- [5] Linting Tool
  - Description: Provide static analysis tooling to detect style and potential bugs (unused vars, suspicious casts, missing returns.)
  - Implementation notes: Reuse AST and TypeChecker. Make rules configurable and add autofix for simple cases.
  - Acceptance criteria: Linter runs and reports actionable warnings; some autofixes available.

- [5] Documentation Generation Tool
  - Description: Tool to parse source comments and generate API docs (HTML/Markdown) for language, libraries, and runtime.
  - Implementation notes: Reuse the parser/AST to extract doc comments and signatures. Provide templates and command-line options for output formats. Consider output used by IDE tooltips. Similar to JSDoc/Doxygen.
  - Acceptance criteria: Running the doc tool outputs a readable API doc set for the std lib and sample modules.

- [4] Shell Autocomplete for CLI
  - Description: Provide bash/zsh completion scripts for the `bpl` CLI (commands and flags).
  - Implementation notes: Generate static/dynamic completion scripts; bundle them with releases; document installation for bash and zsh; consider commander completion helpers; optionally complete file paths and target triples.
  - Acceptance criteria: Users can enable completions in bash and zsh; commands and flags complete correctly; installation steps are documented.

- [6] Allow Structs to Inherit Primitives
  - Description: Permit `struct MyInt : int { ... }` so a struct can behave as a primitive type with additional methods/fields.
  - Implementation notes: Carefully design memory layout and type compatibility: instances of `MyInt` must be usable where `int` is expected. Implement implicit conversion rules and method overriding semantics. Consider specialization in codegen for performance.
  - Acceptance criteria: `MyInt` instances can be passed to APIs expecting `int`; overrides of primitive methods are callable.

- [7] Defer Statement
  - Description: Implement defer for guaranteed execution of cleanup code when scope exits.
  - Implementation notes: Add defer keyword, track deferred statements in scope, inject at all exit points (return, break, normal exit).
  - Acceptance criteria: Defer statements execute in reverse order on scope exit, work correctly with early returns and exceptions.

- [7] Module Visibility and Access Control
  - Description: Add public/private visibility modifiers and module encapsulation.
  - Implementation notes: Add pub/private keywords, enforce visibility during semantic analysis, support module-level exports.
  - Acceptance criteria: Private items cannot be accessed from outside module, pub items are accessible, exports control public API.

- [8] Const Correctness
  - Description: Enforce `const` (or equivalent) declarations and immutability rules across the language: constant variables, read-only fields, `const` parameters, and compile-time constants. Ensure the compiler prevents mutation of `const` values and accepts usage patterns that are safe.
  - Implementation notes: Add `isConst` flag to symbol/type entries. Propagate const through assignments, parameter passing, and returns. Treat `const` references to mutable objects as shallowly const unless a deeper const model is chosen. Decide whether `const` applies to variables, fields, and/or function returns.
  - Acceptance criteria: Examples declaring `const` variables produce errors on mutation; `const` parameters cannot be assigned inside functions; `const` globals evaluate as compile-time constants where used.

- [8] Async/Await
  - Description: Add `async` functions and `await` operator with promise-like semantics to simplify asynchronous programming.
  - Implementation notes: Decide whether to transpile async into callback-based state machines or use runtime coroutines. Provide runtime for futures/promises and event loop integration.
  - Acceptance criteria: `async` functions return a `Future`/`Promise` type and `await` suspends/resumes correctly in examples.

- [8] Threading Support
  - Description: Provide language primitives to create and manage threads, synchronization primitives, and safe concurrency patterns.
  - Implementation notes: Integrate with target threading primitives (pthreads on POSIX). Define memory model and synchronization primitives (mutex, atomic ops).
  - Acceptance criteria: Spawn, join threads, and synchronized access examples behave correctly.

- [8] Inline Assembly Blocks
  - Description: Allow embedding inline assembly with explicit register lists and integration with calling conventions.
  - Implementation notes: Add parser support and a safe lowered representation. During codegen, inject asm inline properly and validate register usage.
  - Acceptance criteria: `asm [rax, rbx] { rdrand rax\n mov rbx, rax\n mov (variable), rbx }` compiles and emits inline assembly; constraints are documented.

- [9] Semantic Analysis Improvements
  - Description: Enhance the TypeChecker and semantic analysis to catch more errors at compile time, such as unreachable code, variable shadowing, and unused variables.
  - Implementation notes: Add passes for control flow analysis (reachability) and scope analysis (shadowing).
  - Acceptance criteria: Compiler warns or errors on unreachable code and shadowed variables.

- [9] REPL (Read-Eval-Print Loop)
  - Description: Implement interactive shell for quick prototyping and testing.
  - Implementation notes: Create input loop, reuse parser/compiler, use JIT or interpreter for immediate execution.
  - Acceptance criteria: REPL accepts expressions and statements, displays results, maintains state across lines.

- [9] Source Code Display for Eval/Stdin Errors
  - Description: Fix error message code snippets when compiling from stdin or eval, which currently show binary data or fail to display source.
  - Implementation notes: Modify CompilerError to optionally accept source lines directly in constructor instead of always reading from file. When using --stdin or -e flags, pass the source code to the error reporting system. May need to thread source through the compilation pipeline or store it in a global context.
  - Acceptance criteria: Errors from stdin/eval display the actual source code line with proper column indicators, not binary data or blank lines.

- [9] Reflection API
  - Description: Provide runtime type inspection and manipulation capabilities.
  - Implementation notes: Generate type metadata during compilation, expose reflection APIs in stdlib (getType, getFields, getMembers).
  - Acceptance criteria: Runtime type information available for inspection, can iterate fields, get method signatures at runtime.

- [9] Result<T, E> Type and Error Propagation
  - Description: Implement Result enum and ? operator for error propagation.
  - Implementation notes: Define Result in stdlib, implement ? operator that unwraps Ok or returns Err, support try-like semantics.
  - Acceptance criteria: Result type works like Rust's Result, ? operator propagates errors, functions returning Result integrate smoothly.

- [9] Macro System
  - Description: Implement compile-time code generation with procedural macros.
  - Implementation notes: Define macro syntax, implement macro expansion phase before semantic analysis, provide AST manipulation API.
  - Acceptance criteria: Macros can generate code, macro rules work correctly, errors in macro expansion are reported.
