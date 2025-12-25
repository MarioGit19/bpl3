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
- [x] Generic-Aware Operator Resolution (Operators work with generic types like Array<T>, Stack<T>, etc.)
- [x] Enum Types - Complete Implementation ✅ (All essential features implemented and tested)
  - ✅ Enum declaration parsing (unit, tuple, struct variants)
  - ✅ Generic enum support with explicit type parameters
  - ✅ Type checking for enum variants
  - ✅ Unit variant construction (e.g., `Color.Red`)
  - ✅ Tuple variant construction (e.g., `Message.Move(10, 20)`)
  - ✅ Struct variant construction (e.g., `Shape.Circle { radius: 5.0 }`)
  - ✅ Match expressions with discriminant checking
  - ✅ Exhaustiveness checking for match expressions
  - ✅ Pattern destructuring in match arms (tuple and struct patterns)
  - ✅ Outer scope variable access in match arm expressions
  - ✅ Enum as function parameters and return types
  - ✅ LLVM IR code generation with full payload storage
  - ✅ Tuple/struct data payload storage and retrieval with proper alignment
  - ✅ Methods on enums with `this` parameter and generic context inheritance
  - ✅ Enum equality comparison operators (==, !=) with tag and payload comparison
  - ✅ Recursive enums with pointer types and proper memory layout
  - ✅ Generic enum type mangling with normalized primitive types (int→i32)
  - ✅ Pattern guards in match expressions - Conditional matching with `if` guards (e.g., `Option.Some(x) if x > 0 => "positive"`)
  - ✅ Type checking with `match<Type>` - Runtime variant discrimination (e.g., `if (match<Option.Some>(opt)) { ... }`)
  - ✅ Formatter support for enums and match expressions
  - ✅ Comprehensive test suite (93 enum-specific tests, 756 integration tests, all passing)
  - ✅ Example programs demonstrating all enum features
  - ✅ Full documentation (user guide and implementation details)
  - ✅ Root Global `Type` Struct - Implicit inheritance for all structs
  - 📝 Future enhancements (non-critical, workarounds exist):
    - Nested pattern matching (e.g., `Outer.Wrapped(Inner.Value(v))`) - use nested match expressions
    - Direct field access on struct variants (e.g., `msg.x`) - use pattern matching instead
    - Namespace-qualified patterns in match (e.g., `Enums.Color.Red`) - import enum directly
    - Generic enum type inference (e.g., `Option.Some(42)` → `Option<int>`) - requires bidirectional type checking
- [x] Multi-Target Support (Cross-compilation via LLVM target triples)
- [x] Root Global `Type` Struct (Implicit inheritance for all structs)
- [x] Primitive Types as Structs Inheriting `Primitive` (Wrapper structs for int, float, bool, char)
- [x] Closures and Lambda Expressions ✅
  - ✅ Lambda syntax `|args| body` implemented
  - ✅ Capture by value semantics verified
  - ✅ `Func<Ret>(Args...)` type support
  - ✅ VS Code Extension support (Syntax Highlighting & Hover)
  - ✅ Integration with Enum Pattern Matching (Capturing pattern bindings)
- [x] Const Correctness ✅
  - ✅ `const` keyword for local variables
  - ✅ `const` keyword for function parameters
  - ✅ Immutability enforcement in TypeChecker
  - ✅ Recursive mutability checking for member access and indexing
  - ✅ `this` treated as const pointer in methods
- [x] Documentation Generator ✅
  - ✅ Multi-line comment syntax changed to `/# ... #/` to avoid Markdown conflict
  - ✅ Markdown generation from comments
  - ✅ Standard Library documentation
  - ✅ CLI `docs` command
- [x] Type Narrowing / Pattern Matching ✅
  - ✅ `is` operator for type checking (e.g., `x is int`)
  - ✅ `as` operator for type casting (e.g., `x as float`)
  - ✅ Struct upcasting (e.g., `Dog` as `Animal`)
  - ✅ Chained casts support (e.g., `x as int as float`)
  - ✅ Formatter support for `as`/`is` expressions (parentheses enforcement)
  - ✅ Integration with `match` expressions
  - ✅ Comprehensive test suite covering inheritance, specs, and enums
- [x] Unused Variable Detection ✅
  - ✅ Compiler error for unused local variables
  - ✅ `_` prefix suppression support
  - ✅ Integration with all existing tests
- [x] Internal Error Structs for Standard Library (Replace integer error codes with proper structs) ✅
  - `ResultUnwrapError`, `OptionUnwrapError`
  - `IndexOutOfBoundsError`, `NullPointerError`
  - `DivisionByZeroError`, `IOError`, `CastError`
- [x] LSP Enhancements ✅
  - ✅ Rename Symbol
  - ✅ Find References
  - ✅ Go to Implementation
  - ✅ Code Actions (Auto-import)
  - ✅ Expanded Snippets
- [x] Result<T, E> Type Implementation ✅
  - ✅ `Result<T, E>` enum in standard library
  - ✅ Helper methods: `isOk`, `isErr`, `unwrap`, `unwrapOr`, `map`, `mapErr`
  - ✅ Operator overloading for Generic Enums (Backend support)
  - ✅ Equality operators (`==`, `!=`) for `Result` and `Option`
  - ✅ Integration tests verifying `Result` functionality
- [x] CLI Eval Error Display Fix ✅
  - ✅ `DiagnosticFormatter` uses `SourceManager` for virtual files
  - ✅ Correct error snippets shown for `--eval` code

## Pending Features (expanded)

### RECOMMENDED NEXT PRIORITIES

- [ ] **Advanced Type System Features**

  - [ ] Type Guards (User-defined `is` functions)

- [x] Multi-Target Support ✅ (FULLY COMPLETE)

  - Description: Add support for targeting multiple platforms and architectures (x86/x64/ARM) and provide conditional std lib methods for platform differences.
  - **Final Status:** ALL COMPLETE ✅ - Verified with Windows (x86_64) and macOS (ARM64) targets
  - Implemented features:
    - ✅ **CLI Support**: `--target`, `--sysroot`, `--cpu`, `--march` flags
    - ✅ **Backend Integration**: `CodeGenerator` emits `target triple` directive
    - ✅ **Module Cache**: Cache keys include target triple to prevent collisions
    - ✅ **Linker**: Forwards target flags to clang
  - Acceptance criteria: Codegen can emit different target outputs and small example programs run on at least two targets.

- [x] Enhanced Error Messages with Location Information ✅

  - Description: Improve all compiler error messages to include precise file:row:column location information and contextual details for faster debugging.
  - **Final Status:** COMPLETE ✅
  - Implemented features:
    - ✅ **Precise Location**: File:row:column format
    - ✅ **Code Snippets**: Visual indicator of problem location with context lines
    - ✅ **Colorized Output**: ANSI colors for better readability
    - ✅ **Error Codes**: Unique error codes (e.g., E001) for easier lookup
    - ✅ **Hints**: Suggestions for fixes
  - Acceptance criteria: Every error message includes file:row:column format, error output includes code snippet with visual indicator of problem location, related errors are grouped, suggestions guide users to fixes.

- [x] Linting Tool ✅

  - Description: Provide static analysis tooling to detect style and potential bugs (unused vars, suspicious casts, missing returns.)
  - **Final Status:** COMPLETE ✅ (Basic Implementation)
  - Implemented features:
    - ✅ **CLI Command**: `bpl lint <files...>`
    - ✅ **Linter Engine**: Extensible rule-based linter
    - ✅ **Naming Convention Rule**: Checks for PascalCase structs and camelCase/snake_case functions
  - Acceptance criteria: Linter runs and reports actionable warnings.

- [x] Debugger Support (DWARF)

  - Description: Generate DWARF debug information to enable source-level debugging with tools like GDB and LLDB.
  - **Status:** IN PROGRESS (Line Info & Subprograms)
  - Implemented features:
    - ✅ **CLI Flag**: `--dwarf`
    - ✅ **Metadata Generator**: `DebugInfoGenerator` class
    - ✅ **Compile Unit**: Emits `!llvm.dbg.cu` and `!DICompileUnit`
    - ✅ **Subprograms**: Emits `!DISubprogram` for functions
    - ✅ **Line Info**: Attaches `!dbg` location to instructions
  - Implementation notes: Map BPL source locations to LLVM IR debug metadata, generate DWARF type descriptors, emit debug info for functions/variables.
  - Acceptance criteria: Can step through BPL code in GDB/LLDB, variables show correct values, breakpoints work.
  - Implementation notes: Map BPL source locations to LLVM IR debug metadata, generate DWARF type descriptors, emit debug info for functions/variables.
  - Acceptance criteria: Can step through BPL code in GDB/LLDB, variables show correct values, breakpoints work.

- [5] Documentation Generation Tool

  - Description: Tool to parse source comments and generate API docs (HTML/Markdown) for language, libraries, and runtime.
  - Implementation notes: Reuse the parser/AST to extract doc comments and signatures. Provide templates and command-line options for output formats. Consider output used by IDE tooltips. Similar to JSDoc/Doxygen.
  - Acceptance criteria: Running the doc tool outputs a readable API doc set for the std lib and sample modules.

- [x] Shell Autocomplete for CLI ✅

  - Description: Provide bash/zsh completion scripts for the `bpl` CLI (commands and flags).
  - **Final Status:** COMPLETE ✅
  - Implemented features:
    - ✅ **Bash Script**: `completions/bpl-completion.bash`
    - ✅ **Zsh Support**: Embedded Zsh completion script
    - ✅ **Updated Commands**: Includes `lint`, `--dwarf`, etc.
  - Acceptance criteria: Users can enable completions in bash and zsh; commands and flags complete correctly; installation steps are documented.

- [5] Language Server Protocol (LSP) Enhancements

  - Description: Expand capabilities to support "Rename Symbol", "Find All References", "Go to Implementation", and "Code Actions".
  - Implementation notes: Implement rename/references/implementation requests, add code actions, improve sync.
  - Acceptance criteria: Renaming updates references, find references works, go to implementation works.

- [x] String Interpolation ✅

  - Description: Support embedding expressions directly into string literals using `${expression}` syntax.
  - **Final Status:** COMPLETE ✅
  - Implemented features:
    - ✅ **Syntax**: `$"..."` literals with `${expr}` interpolation
    - ✅ **Lexer/Parser**: Updated to handle interpolated strings
    - ✅ **Type Checker**: Desugars to `String` concatenation
    - ✅ **Codegen**: Generates code for concatenated strings
    - ✅ **Documentation**: Added `docs/54-string-interpolation.md`
  - Acceptance criteria: `$"Hello ${name}"` compiles, expressions evaluated correctly.

- [x] Allow Structs to Inherit Primitives ✅

  - Description: Permit `struct MyInt : int { ... }` so a struct can behave as a primitive type with additional methods/fields.
  - **Final Status:** COMPLETE ✅
  - Implemented features:
    - ✅ **Syntax**: `struct A : int`
    - ✅ **Type Checker**: Validates inheritance and allows casting
    - ✅ **Codegen**: Handles layout (`__base__` field) and casting (wrap/unwrap)
  - Acceptance criteria: `MyInt` instances can be passed to APIs expecting `int`.

- [6] Default and Named Arguments

  - Description: Allow functions to define default values for parameters and allow callers to specify arguments by name.
  - Implementation notes: Update declaration/call syntax, resolve defaults at call site, handle named args.
  - Acceptance criteria: Can declare/call with defaults, can use named arguments.

- [7] Defer Statement

  - Description: Implement defer for guaranteed execution of cleanup code when scope exits.
  - Implementation notes: Add defer keyword, track deferred statements in scope, inject at all exit points (return, break, normal exit).
  - Acceptance criteria: Defer statements execute in reverse order on scope exit, work correctly with early returns and exceptions.

- [7] Module Visibility and Access Control

  - Description: Add public/private visibility modifiers and module encapsulation.
  - Implementation notes: Add pub/private keywords, enforce visibility during semantic analysis, support module-level exports.
  - Acceptance criteria: Private items cannot be accessed from outside module, pub items are accessible, exports control public API.

- [7] Package Registry and Dependency Management

  - Description: Create a centralized package registry and enhance package manager for publishing/versioning.
  - Implementation notes: Design metadata format, implement semantic versioning, create registry API, add publish/install commands.
  - Acceptance criteria: Can publish/install packages, version constraints respected.

- [7] WebAssembly (WASM) Target

  - Description: Add compilation target for WebAssembly (WASM) to run BPL in browsers.
  - Implementation notes: Add wasm32 target support, handle ABI differences, map primitives, generate .wasm via LLVM.
  - Acceptance criteria: Can compile to .wasm, runs in browser/Node.js.

- [8] Null Safety Operators

  - Description: Introduce null-safe navigation (`?.`) and null-coalescing (`??`) operators.
  - Implementation notes: Implement `?.` and `??` operators, desugar to conditional checks.
  - Acceptance criteria: `ptr?.field` returns null if ptr is null, `val ?? default` works.

- [5] Parallel Compilation

  - Description: Utilize multi-core processors to compile independent modules in parallel.
  - Implementation notes: Analyze dependency graph, use worker threads/processes, manage shared resources.
  - Acceptance criteria: `bpl build` uses multiple cores, build time decreases.

- [5] Watch Mode

  - Description: Add `--watch` mode to CLI to recompile on file changes.
  - Implementation notes: Use file watcher, integrate with incremental compilation, debounce events.
  - Acceptance criteria: `bpl build --watch` rebuilds on change.

- [6] Parser Error Recovery

  - Description: Improve parser to recover from syntax errors and continue parsing.
  - Implementation notes: Implement synchronization points, skip tokens, mark error nodes.
  - Acceptance criteria: Reports multiple errors per file, doesn't crash on malformed input.

- [6] Nested Pattern Matching

  - Description: Extend pattern matching to support nested patterns (e.g., `Option.Some(Result.Ok(x))`).
  - Implementation notes: Update parser/typechecker/codegen for recursive pattern matching.
  - Acceptance criteria: Can match deeply nested structures, exhaustiveness checking works.

- [x] Explicit Memory Initialization ✅

  - Description: Mechanism to initialize raw memory as valid object (set `__null_bit__`).
  - **Final Status:** COMPLETE ✅
  - Implemented features:
    - ✅ **Intrinsic**: `std.mem.init<T>(ptr)`
    - ✅ **Codegen**: Sets `__null_bit__` to 1 in LLVM IR
  - Acceptance criteria: Can use malloc'd memory without constructor call.

- [7] Fuzz Testing Integration

  - Description: Integrate fuzz testing (e.g., LLVM libFuzzer) to find compiler crashes.
  - Implementation notes: Create fuzz target for frontend, link with libFuzzer, run in CI.
  - Acceptance criteria: Fuzzer runs and finds crashes.

- [7] Compiler Performance Benchmarking

  - Description: Track compiler performance (time/memory) to prevent regressions.
  - Implementation notes: Create benchmark suite, scripts to measure metrics, CI integration.
  - Acceptance criteria: Benchmarks run automatically, regressions flagged.

- [7] Automatic C Binding Generation (bindgen)

  - Description: Tool to generate BPL `extern` declarations from C headers.
  - Implementation notes: Use libclang to parse headers, map types, generate BPL files.
  - Acceptance criteria: Can generate bindings for standard C libs, generated code compiles.

- [7] Standard Library: Networking & HTTP

  - Description: Add TCP/UDP sockets and HTTP client to stdlib.
  - Implementation notes: Wrap platform socket APIs, implement HTTP client.
  - Acceptance criteria: Can create servers/clients, make HTTP requests.

- [7] Standard Library: System Calls & OS Interaction

  - Description: Add support for signal handling, environment variables, and process control.
  - Implementation notes: Wrap `signal`, `getenv`, `setenv`, `fork`, `exec`, `wait`.
  - Acceptance criteria: Can handle SIGINT, read/write env vars, spawn child processes.

- [7] Standard Library: Date & Time

  - Description: Add Date, Time, Duration types and formatting utilities.
  - Implementation notes: Wrap `time.h` functions, implement high-level Date/Time structs.
  - Acceptance criteria: Can get current time, format dates, measure duration.

- [7] Standard Library: JSON & Serialization

  - Description: Add support for parsing and generating JSON data.
  - Implementation notes: Implement `std.json.parse` and `std.json.stringify`.
  - Acceptance criteria: Can parse JSON strings and serialize objects to JSON.

- [7] Standard Library: Cryptography & Hashing

  - Description: Provide basic cryptographic primitives and secure random number generation.
  - Implementation notes: Implement `std.crypto.hash` (SHA256) and `std.crypto.random`.
  - Acceptance criteria: Can compute hashes and generate secure random numbers.

- [7] Standard Library: Regular Expressions

  - Description: Add support for regular expressions.
  - Implementation notes: Wrap a C regex library or implement basic engine.
  - Acceptance criteria: Can match strings against regex patterns and extract groups.

- [7] Standard Library: Advanced Collections

  - Description: Expand collection types (Set, LinkedList, Queue, Stack, PriorityQueue).
  - Implementation notes: Implement generic data structures in stdlib.
  - Acceptance criteria: Can use Set, Queue, Stack, etc. in programs.

- [7] Standard Library: BigInt & Arbitrary Precision

  - Description: Add support for arbitrary precision integers.
  - Implementation notes: Wrap GMP or implement native BigInt.
  - Acceptance criteria: Can perform math on numbers > 64 bits.

- [7] Standard Library: Compression & Archiving

  - Description: Add support for zlib/gzip compression.
  - Implementation notes: Wrap zlib C library.
  - Acceptance criteria: Can compress and decompress data.

- [7] Standard Library: Encoding & Decoding

  - Description: Add Base64, Hex, and CSV support.
  - Implementation notes: Implement encoding utilities.
  - Acceptance criteria: Can encode/decode Base64, parse CSV.

- [8] Middle-end Optimizations

  - Description: Implement BPL-specific optimization passes before LLVM IR generation.
  - Implementation notes: Dead code elimination, constant folding, inlining on AST/IR.
  - Acceptance criteria: Generated code is cleaner/faster, compile-time evaluation improved.

- [8] Compile-Time Function Execution (CTFE)

  - Description: Execute functions at compile time to generate constants.
  - Implementation notes: Interpreter for BPL IR/AST, execute during semantic analysis.
  - Acceptance criteria: `const x = factorial(5)` works at compile time.

- [8] Code Coverage Integration

  - Description: Generate coverage reports for tests.
  - Implementation notes: Instrument LLVM IR with coverage mapping, support llvm-cov.
  - Acceptance criteria: Can generate and view coverage reports.

- [8] Region-Based Memory Management (Arenas)

  - Description: Add Arena allocators to stdlib for efficient memory management.
  - Implementation notes: Implement Arena struct, bulk allocation/deallocation.
  - Acceptance criteria: Can allocate from arena, reset frees all memory.

- [8] Async/Await

  - Description: Add `async` functions and `await` operator with promise-like semantics to simplify asynchronous programming.
  - Implementation notes: Decide whether to transpile async into callback-based state machines or use runtime coroutines. Provide runtime for futures/promises and event loop integration.
  - Acceptance criteria: `async` functions return a `Future`/`Promise` type and `await` suspends/resumes correctly in examples.

- [8] Threading Support

  - Description: Provide language primitives to create and manage threads, synchronization primitives, and safe concurrency patterns.
  - Implementation notes: Integrate with target threading primitives (pthreads on POSIX). Define memory model and synchronization primitives (mutex, atomic ops).
  - Acceptance criteria: Spawn, join threads, and synchronized access examples behave correctly.

- [8] Inline Assembly Blocks (Partially Implemented)

  - Description: Allow embedding inline assembly with explicit register lists and integration with calling conventions. Support `asm("flavor") { ... }` syntax for different assembly dialects (e.g., "intel", "att") or targets.
  - **Status:** PARTIAL
  - Implemented:
    - ✅ `asm("flavor") { ... }` syntax parsing
    - ✅ Raw string injection into LLVM IR
    - ✅ Simple variable substitution `(var)` -> local register
  - Missing:
    - ❌ Flavor-based wrapping (e.g. `call asm`)
    - ❌ Explicit register constraints
    - ❌ Validation of assembly content
  - Implementation notes: Add parser support and a safe lowered representation. During codegen, inject asm inline properly and validate register usage. Implement variable interpolation `(var)` and flavor-based wrapping (e.g. automatically wrapping x86 asm in LLVM `call asm`).
  - Acceptance criteria: `asm("intel") { mov rax, 42 }` compiles and emits correct inline assembly; `asm { ... (var) ... }` correctly interpolates variables.

- [9] Semantic Analysis Improvements

  - Description: Enhance the TypeChecker and semantic analysis to catch more errors at compile time, such as unreachable code, variable shadowing, and unused variables.
  - **Status:** PARTIAL
  - Implemented:
    - ✅ Unreachable code detection
    - ✅ Redeclaration check (same scope)
    - ✅ Unused variable detection
  - Missing:
    - ❌ Shadowing warning (outer scope)
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

- [9] Macro System
  - Description: Implement compile-time code generation with procedural macros.
  - Implementation notes: Define macro syntax, implement macro expansion phase before semantic analysis, provide AST manipulation API.
  - Acceptance criteria: Macros can generate code, macro rules work correctly, errors in macro expansion are reported.
