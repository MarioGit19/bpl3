# BPL3 Compiler Progress

- Number inside brackets indicates priority (lower number = higher priority), x indicates completed features.

## Completed Features

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

## Pending Features (expanded)

- [9] Const Correctness

  - Description: Enforce `const` (or equivalent) declarations and immutability rules across the language: constant variables, read-only fields, `const` parameters, and compile-time constants. Ensure the compiler prevents mutation of `const` values and accepts usage patterns that are safe.
  - Implementation notes: Add `isConst` flag to symbol/type entries. Propagate const through assignments, parameter passing, and returns. Treat `const` references to mutable objects as shallowly const unless a deeper const model is chosen. Decide whether `const` applies to variables, fields, and/or function returns.
  - Acceptance criteria: Examples declaring `const` variables produce errors on mutation; `const` parameters cannot be assigned inside functions; `const` globals evaluate as compile-time constants where used.

- [4] Advanced Generics (Constraints, Inference)

  - Description: Add generic constraints (e.g., `T: Comparable`) and local inference so generic functions can deduce type parameters from call-sites where possible.
  - Implementation notes: Extend type parameter structures to include bounds; implement constraint checking during type inference/resolution. Add unification and constraint propagation algorithm to TypeChecker.
  - Acceptance criteria: Constrained generics accept only types satisfying bounds; generic functions without explicit type args can be called with types that infer correctly.

- [4] Function overloading by parameter types

  - Description: Allow multiple functions with the same name but different parameter type lists. Overload resolution must pick the best match based on argument types and implicit conversions.
  - Implementation notes: Extend symbol table to store overload sets; implement overload resolution algorithm considering exact matches, promotions, and user-defined conversions. Detect ambiguities and report errors.
  - Acceptance criteria: Multiple functions with same name but different signatures compile and calls resolve to correct overload; ambiguous calls produce clear diagnostics.

- [4] Operator overloading for user types

  - Description: Let user-defined types implement special methods (dunder-style like `__add__`, `__eq__`) that override built-in operator behavior for instances.
  - Implementation notes: Define mapping between operators and method names; during type-checking, if an operand type has the corresponding method, resolve to that method; otherwise fall back to builtin semantics. Disallow assignment operators overloading. Ensure overload resolution supports left/right operand dispatch and coercions.
  - Acceptance criteria: Defining `__add__` on a struct causes `a + b` to call that method; operator resolution respects type conversions and produces helpful errors when ambiguous.

- [3] Constructors and destructors for structs

  - Description: Support `StructName.new(...)` constructors (default, parameterized, copy) and `variable.destroy()` destructors. Constructors can be overloaded by parameter types; destructors run manually in the current model.
  - Implementation notes: Add named constructor resolution on struct types and special destructor method. Wire constructor to allocate and initialize memory; implement destructor chaining across inheritance. Consider automatic destructor invocation for stack-local variables later.
  - Acceptance criteria: `S.new()` constructs objects correctly; `obj.destroy()` triggers destructor logic; inheritance constructors/destructors chain appropriately. after destroy mark object as invalid unless re-initialized.

- [5] Root global `Type` struct

  - Description: Define a root `Type` struct that every user-defined struct implicitly inherits from, providing methods like `getTypeName()`, `getSize()`, `toString()`, and basic equality.
  - Implementation notes: Add injection of implicit base for every struct during parsing/semantic analysis. Implement common methods as part of the runtime/stdlib. Ensure virtual dispatch works (method overriding) if language supports it.
  - Acceptance criteria: Any struct can call `getTypeName()`; common operations are available without explicit inheritance in source.

- [5] Primitive types as structs inheriting `Primitive`

  - Description: Model primitive types (int, float, bool, char) as structs inheriting from a `Primitive` base, exposing operations as methods to unify the type system.
  - Implementation notes: Represent primitives specially in the type system but provide method dispatch wrappers so code like `int_val.toString()` is valid. Balance performance (inlined primitives) with uniformity (object-like methods).
  - Acceptance criteria: Primitive methods are callable and interoperate with language operators; performance-sensitive paths remain efficient.

- [7] Allow structs to inherit primitives

  - Description: Permit `struct MyInt : int { ... }` so a struct can behave as a primitive type with additional methods/fields.
  - Implementation notes: Carefully design memory layout and type compatibility: instances of `MyInt` must be usable where `int` is expected. Implement implicit conversion rules and method overriding semantics. Consider specialization in codegen for performance.
  - Acceptance criteria: `MyInt` instances can be passed to APIs expecting `int`; overrides of primitive methods are callable.

- [3] Standard library module

  - Description: Build a comprehensive standard library as an importable module providing data structures (lists, maps, sets), algorithms, string utilities, and math helpers.
  - Implementation notes: Start with small, critical modules (strings, arrays, io). Provide both high-level BPL implementations and low-level runtime helpers backed by `lib/` for performance-critical functions.
  - Acceptance criteria: Example programs can `import std` and use library features; library code compiles and links with generated code.

- [3] Error handling and diagnostics

  - Description: Improve compiler error reporting across lexer, parser, type checker, and the code generator with clear source locations, hint messages, and suggested fixes.
  - Implementation notes: Standardize error types and formatting. Enrich `CompilerError` with categories, severity, and potential quick-fixes. Add tests for common error scenarios.
  - Acceptance criteria: Errors include file/line/column, a concise message, and at least one suggestion when applicable.

- [5] AST/IR printing flags

  - Description: Add compiler flags to dump AST or IR to console or file (e.g., `-ast`, `-ir -oLL file.ll`) for debugging.
  - Implementation notes: Implement pretty printers for AST and any intermediate IR. Add CLI options for selecting output format and file path.
  - Acceptance criteria: Flags print human-readable AST/IR; `-o` writes to files when specified.

- [6] Documentation generation tool

  - Description: Tool to parse source comments and generate API docs (HTML/Markdown) for language, libraries, and runtime.
  - Implementation notes: Reuse the parser/AST to extract doc comments and signatures. Provide templates and command-line options for output formats. Consider output used by IDE tooltips. Similar to JSDoc/Doxygen.
  - Acceptance criteria: Running the doc tool outputs a readable API doc set for the std lib and sample modules.

- [4] VS Code extension (syntax, completion)

  - Description: Create a lightweight VS Code extension for syntax highlighting, completion, and basic diagnostics using the compiler or language server.
  - Implementation notes: Start with TextMate grammar for highlighting and a simple language server protocol (LSP) stub that calls the compiler for diagnostics. Package and test in `vs-code-ext/`.
  - Acceptance criteria: Extension highlights syntax and shows compile-time errors in the editor. Basic completion for keywords and std lib symbols. Go to definition for symbols in same or imported files.

- [3] Code formatter

  - Description: Implement an opinionated code formatter to enforce a consistent style for BPL3 source files.
  - Implementation notes: Implement AST-driven pretty-printer to avoid ambiguous formatting. Provide `format` CLI and editor integration.
  - Acceptance criteria: Running formatter produces stable, idempotent formatting for sample files.

- [3] Error handling and diagnostics

  - Description: Add compiler flags to dump AST or IR to console or file (e.g., `-ast`, `-ir -oLL file.ll`) for debugging.
  - Implementation notes: Implement pretty printers for AST and any intermediate IR. Add CLI options for selecting output format and file path.
  - Acceptance criteria: Flags print human-readable AST/IR; `-o` writes to files when specified.

- [6] Documentation generation tool

  - Description: Implement syntax and semantics for narrowing variable types based on runtime checks (useful inside `catch` blocks or generic contexts).
  - Implementation notes: Add a `match<T>(expr)` AST construct and TypeChecker rules to narrow variable types inside block scope. Ensure RTTI support for runtime checks.
  - Acceptance criteria: Within a `match<T>(v)` block, `v` has type `T` and member accesses/overloads resolve accordingly.

- [9] Async/await

  - Description: Add `async` functions and `await` operator with promise-like semantics to simplify asynchronous programming.
  - Implementation notes: Decide whether to transpile async into callback-based state machines or use runtime coroutines. Provide runtime for futures/promises and event loop integration.
  - Acceptance criteria: `async` functions return a `Future`/`Promise` type and `await` suspends/resumes correctly in examples.

- [9] Threading support

  - Description: Provide language primitives to create and manage threads, synchronization primitives, and safe concurrency patterns.
  - Implementation notes: Integrate with target threading primitives (pthreads on POSIX). Define memory model and synchronization primitives (mutex, atomic ops).
  - Acceptance criteria: Spawn, join threads, and synchronized access examples behave correctly.

- [3] Robust import/export & linking

  - Description: Improve module resolution for relative/absolute imports, support compiled-object linking and extern declarations for FFI, allow importing from 'std' and resolution from like file 'package.json', eg 'web-server' maps to ~/.bpl/lib/web-server.
  - Implementation notes: Implement full import resolution phase, module cache, and link-time symbol verification. Add `extern` declarations for linking with C/LLVM objects.
  - Acceptance criteria: Multi-file projects import and link correctly; extern functions can be declared and linked.

- [6] Linting tool

  - Description: Provide static analysis tooling to detect style and potential bugs (unused vars, suspicious casts, missing returns.)
  - Implementation notes: Reuse AST and TypeChecker. Make rules configurable and add autofix for simple cases.
  - Acceptance criteria: Linter runs and reports actionable warnings; some autofixes available.

- [5] Multi-target support

  - Description: Add support for targeting multiple platforms and architectures (x86/x64/ARM) and provide conditional std lib methods for platform differences.
  - Implementation notes: Abstract target-specific codegen paths and provide a target triple input. Maintain a small set of runtime abstractions for syscalls/ABI.
  - Acceptance criteria: Codegen can emit different target outputs and small example programs run on at least two targets.

- [6] Inline assembly blocks

  - Description: Allow embedding inline assembly with explicit register lists and integration with calling conventions.
  - Implementation notes: Add parser support and a safe lowered representation. During codegen, inject asm inline properly and validate register usage.
  - Acceptance criteria: `asm [rax, rbx] { rdrand rax\n mov rbx, rax\n mov (variable), rbx }` compiles and emits inline assembly; constraints are documented.

