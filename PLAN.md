# Development Plan

This document outlines the implementation plan for the remaining tasks in the project roadmap. Each section details the implementation strategy, steps, and the importance of the feature.

## 1. Add Support for Custom Calling Conventions

**Importance:**
Crucial for interoperability with operating system APIs (e.g., Windows API uses `stdcall`) and other programming languages. It allows the compiler to generate code that respects specific register usage and stack cleanup rules.

**Implementation Strategy:**

- Extend the function declaration syntax to accept calling convention annotations (e.g., `@stdcall`, `@fastcall`, `@cdecl`).
- Update the `FunctionInfo` structure in the symbol table to store this metadata.
- Modify the backend (LLVM/Assembly generator) to adjust argument passing (registers vs stack) and stack cleanup responsibilities (caller vs callee) based on the convention.

**Steps:**

1.  Update `lexer` and `parser` to recognize calling convention attributes.
2.  Store convention in `FunctionDeclarationExpr` and `Scope`.
3.  Update `LLVMTargetBuilder` to set the correct calling convention on LLVM functions.
4.  Update assembly generators to implement specific ABI rules for each convention.

## 2. Support Incremental Recompilation Caching

**Importance:**
Significantly reduces build times for large projects by only recompiling files that have changed or depend on changed files.

**Implementation Strategy:**

- Implement a caching mechanism that stores the hash of source files and the resulting build artifacts (object files/IR).
- Create a dependency graph to track which files import which.

**Steps:**

1.  Create a build cache directory structure.
2.  Implement file hashing (e.g., SHA-256) for source files.
3.  Serialize the dependency graph.
4.  Modify the build script/CLI to check hashes against the cache before compiling.
5.  If a hash matches, reuse the artifact; otherwise, compile and update the cache.

## 3. Add Target Architecture Abstraction Layer

**Importance:**
Decouples the compiler frontend from specific backends, making it easier to support new architectures (ARM, RISC-V, WASM) without changing the core logic.

**Implementation Strategy:**

- Define a `Target` interface that abstracts common operations: register allocation, instruction selection, and binary emission.
- Refactor existing x86/LLVM code into specific implementations of this interface.

**Steps:**

1.  Define `ITarget` interface in `transpiler/target/`.
2.  Move `LLVMTargetBuilder` to implement `ITarget`.
3.  Create a generic `AssemblyGenerator` that uses `ITarget`.
4.  Implement `X86Target`, `ARMTarget`, etc.

## 4. Implement Plugin Architecture for Extensibility

**Importance:**
Allows the community to extend the compiler with custom linters, optimizers, or syntax extensions without forking the core repository.

**Implementation Strategy:**

- Define a hook system where plugins can register callbacks for different compilation phases (Parsing, Analysis, CodeGen).
- Use dynamic module loading to load external plugins.

**Steps:**

1.  Define a `Plugin` interface.
2.  Add `PluginManager` to load and execute plugins.
3.  Add hooks in `Parser`, `SemanticAnalyzer`, and `Transpiler`.
4.  Create a sample plugin (e.g., a custom linter rule).

## 5. Implement Enum Types and Pattern Matching

**Importance:**
Enums (especially tagged unions) provide type-safe ways to represent state. Pattern matching offers a powerful and expressive way to handle control flow based on data structure.

**Implementation Strategy:**

- Add `enum` keyword.
- Implement `match` expression.
- Ensure exhaustiveness checking in the semantic analyzer.

**Steps:**

1.  Update grammar to support `enum Name { Case1, Case2(Type) }`.
2.  Update grammar for `match` expression.
3.  Implement semantic analysis for type checking and exhaustiveness.
4.  Implement code generation (likely compiled to tagged unions/structs and switch statements).

## 6. Add Support for Interfaces/Traits

**Importance:**
Enables polymorphism and code reuse by defining behavior contracts. Allows writing generic code that works with any type implementing a specific interface.

**Implementation Strategy:**

- Add `interface` or `trait` keyword.
- Allow structs to `implement` interfaces.
- Use v-tables for dynamic dispatch or monomorphization for static dispatch.

**Steps:**

1.  Add `interface` syntax (method signatures).
2.  Add `impl Interface for Struct` syntax.
3.  Update `TypeChecker` to validate implementations.
4.  Implement dispatch mechanism (likely v-tables for initial support).

## 7. Implement a Language Server Protocol (LSP) Server

**Importance:**
Provides a modern IDE experience (VS Code, Neovim, etc.) with features like autocompletion, go-to-definition, and real-time error reporting.

**Implementation Strategy:**

- Create a separate process that speaks JSON-RPC (LSP).
- Reuse the compiler's `Parser` and `SemanticAnalyzer` to generate diagnostics and symbol information.

**Steps:**

1.  Set up an LSP project using `vscode-languageserver-node`.
2.  Implement `textDocument/didChange` to parse code in memory.
3.  Implement `textDocument/publishDiagnostics` to report errors.
4.  Implement `textDocument/definition` and `textDocument/completion` using the `SymbolTable`.

## 8. Add WebAssembly (WASM) Compilation Target

**Importance:**
Allows the language to run in web browsers and other WASM environments, expanding its reach to full-stack development.

**Implementation Strategy:**

- Leverage the LLVM backend's existing WASM support.
- Alternatively, implement a direct WASM binary emitter.

**Steps:**

1.  Add `wasm32` to the list of supported targets.
2.  Configure `LLVMTargetBuilder` to target `wasm32-unknown-unknown`.
3.  Map language primitives to WASM types.
4.  Create a browser loader example.

## 9. Implement 'defer' Statement

**Importance:**
Simplifies resource management (closing files, freeing memory) by ensuring cleanup code runs when the scope exits, reducing memory leaks and bugs.

**Implementation Strategy:**

- Add `defer` keyword.
- Compiler maintains a stack of deferred statements for the current block.
- Upon block exit (return, break, end of block), emit the deferred statements in reverse order.

**Steps:**

1.  Update parser to accept `defer <statement>`.
2.  In `Transpiler`, track deferred statements in the current `Scope`.
3.  Inject deferred code at all exit points of the scope.

## 10. Create a Package Manager

**Importance:**
Essential for ecosystem growth. Allows users to easily manage dependencies, publish libraries, and build projects.

**Implementation Strategy:**

- Define a manifest format (e.g., `bpl.toml`).
- Implement a CLI tool (`bpl pkg`) to resolve and fetch dependencies (git or registry).

**Steps:**

1.  Design `bpl.toml` schema.
2.  Implement dependency resolution algorithm (version solving).
3.  Implement fetching logic (cloning git repos to a global/local cache).
4.  Integrate with the build system to include dependencies in the compilation.

## 11. Add Support for Multi-threading/Concurrency

**Importance:**
Enables programs to utilize multi-core processors for better performance.

**Implementation Strategy:**

- Add primitives for thread creation (`spawn`).
- Add synchronization primitives (Mutex, Atomic) to the standard library.
- Ensure the memory model supports concurrent access.

**Steps:**

1.  Map `spawn` to OS threads (pthreads/WinAPI).
2.  Implement `Mutex` and `ConditionVariable` in `lib/std`.
3.  Add atomic intrinsics to the compiler.

## 12. Implement Closures and Lambda Expressions

**Importance:**
Facilitates functional programming patterns and makes callback-based APIs cleaner.

**Implementation Strategy:**

- Add syntax for anonymous functions: `|args| -> { body }`.
- Implement environment capturing: create a hidden struct containing captured variables.

**Steps:**

1.  Update parser for lambda syntax.
2.  Analyze captured variables in `SemanticAnalyzer`.
3.  Generate a struct for the closure environment.
4.  Transform the lambda into a function taking the environment struct as an argument.

## 13. Add Support for Tuple Types and Destructuring

**Importance:**
Allows functions to return multiple values easily and enables concise data grouping without defining named structs.

**Implementation Strategy:**

- Add tuple syntax `(i32, f64)`.
- Implement structural typing for tuples.
- Add destructuring assignment `let (a, b) = my_tuple;`.

**Steps:**

1.  Update parser for tuple literals and types.
2.  Update `TypeChecker` to handle structural equality.
3.  Implement destructuring in assignment logic (lower to member access).

## 14. Create a Documentation Generator Tool

**Importance:**
Automated documentation ensures that codebases are well-documented and accessible to other developers.

**Implementation Strategy:**

- Parse special comment blocks (e.g., `///`).
- Extract signatures and comments.
- Generate static HTML/Markdown files.

**Steps:**

1.  Update `Lexer` to preserve doc comments.
2.  Create a `DocGenerator` class that traverses the AST.
3.  Generate HTML templates for modules, structs, and functions.

## 15. Implement a REPL (Read-Eval-Print Loop)

**Importance:**
Great for learning the language, quick prototyping, and debugging small snippets.

**Implementation Strategy:**

- Implement an interactive shell.
- Parse input line-by-line.
- Use JIT compilation (via LLVM) or an interpreter to execute code immediately.

**Steps:**

1.  Create a REPL entry point.
2.  Implement line reading loop.
3.  Reuse `Parser` for fragments.
4.  Implement an `Interpreter` or configure LLVM JIT for immediate execution.

## 16. Add Debug Information Generation (DWARF/Source Maps)

**Importance:**
Allows developers to debug their code using standard tools (GDB, LLDB, VS Code Debugger) with source-level stepping and variable inspection.

**Implementation Strategy:**

- Emit DWARF debug sections in the object file.
- Map instruction pointers to source file lines and columns.

**Steps:**

1.  Use LLVM's `DIBuilder` API.
2.  Create compilation units, subprograms, and lexical blocks in debug info.
3.  Attach debug locations to generated instructions.

## 17. Implement Generic Type Constraints

**Importance:**
Ensures that generic types meet certain requirements (e.g., "T must implement Add"), preventing errors inside generic implementations and enabling better error messages.

**Implementation Strategy:**

- Extend generic syntax: `func foo<T: Number>(arg: T)`.
- Validate constraints at the call site.

**Steps:**

1.  Update parser to accept constraints.
2.  Update `SemanticAnalyzer` to check if types satisfy constraints during instantiation.
3.  Allow access to trait methods on generic types within the function body.

## 18. Add Standard Library Modules for Networking and JSON

**Importance:**
Essential for building real-world applications like web servers, CLI tools, and data processing utilities.

**Implementation Strategy:**

- **Networking**: Wrap OS socket APIs (socket, bind, listen, connect).
- **JSON**: Implement a parser and serializer in the language itself.

**Steps:**

1.  Create `lib/net.x` with socket bindings.
2.  Create `lib/json.x` with a recursive descent parser for JSON.
3.  Add serialization support (reflection or code gen).

## 19. Implement a Macro System

**Importance:**
Enables metaprogramming, allowing developers to reduce boilerplate and create domain-specific languages (DSLs).

**Implementation Strategy:**

- Implement procedural macros (functions that take AST and return AST).
- Run macro expansion before semantic analysis.

**Steps:**

1.  Define macro syntax `macro name { ... }`.
2.  Implement an expansion phase in the compiler.
3.  Provide an API for manipulating AST nodes within macros.

## 20. Add Built-in Unit Testing Framework

**Importance:**
Encourages testing by making it a first-class citizen. Removes the need for external test runners.

**Implementation Strategy:**

- Add `@test` annotation for functions.
- Add a `test` command to the compiler CLI.

**Steps:**

1.  Recognize `@test` attribute.
2.  Collect all test functions during compilation.
3.  Generate a test runner entry point that calls all test functions and reports results.

## 21. Improve FFI for C Interoperability

**Importance:**
Allows the language to leverage the vast ecosystem of existing C libraries.

**Implementation Strategy:**

- Add `extern "C"` blocks.
- Automate type mapping between C types and language types.
- Support C header parsing (optional but helpful).

**Steps:**

1.  Refine `extern` syntax.
2.  Ensure ABI compatibility (struct layout, padding).
3.  Create tools to generate bindings from C headers.

## 22. Implement Dead Code Elimination (DCE)

**Importance:**
Reduces the size of the generated binary by removing functions and variables that are never used.

**Implementation Strategy:**

- Perform reachability analysis starting from `main`.
- Remove unreachable nodes from the dependency graph before code generation.

**Steps:**

1.  Build a call graph.
2.  Mark `main` and exported functions as roots.
3.  Traverse the graph and mark reachable symbols.
4.  Prune unmarked symbols.

## 23. Work Towards Self-Hosting

**Importance:**
A major milestone for any language. It proves the language is robust enough to build complex software (itself) and allows developers to "dogfood" their own tools.

**Implementation Strategy:**

- Rewrite the compiler components (Lexer, Parser, etc.) in the language one by one.
- Use the existing TypeScript compiler to build the new compiler until it can build itself.

**Steps:**

1.  Port `Lexer` to BPL.
2.  Port `Parser`.
3.  Port `SemanticAnalyzer`.
4.  Port `Codegen`.
5.  Bootstrap: Use TS compiler to compile BPL compiler, then use BPL compiler to compile itself.

## 24. Add Support for Operator Overloading

**Importance:**
Makes user-defined types (like Vectors, Matrices, BigInts) more intuitive to use with standard mathematical operators.

**Implementation Strategy:**

- Allow defining methods with special names (e.g., `__add__`, `__sub__`).
- Rewrite binary expressions to method calls if the types match.

**Steps:**

1.  Define the mapping between operators and method names.
2.  Update `SemanticAnalyzer` to look for these methods when encountering operators on non-primitive types.
3.  Transform `a + b` into `a.__add__(b)`.

## 25. Add Support for Constructors

**Importance:**
Ensures that objects are properly initialized with valid state upon creation. It simplifies object instantiation and enforces invariants.

**Implementation Strategy:**

- Reserve a special method name (e.g., `constructor` or `init`) within struct definitions.
- When a struct is instantiated via `new Type(...)` or `Type(...)`, call this method.
- The constructor should handle initializing fields.

**Steps:**

1.  Update `Parser` to recognize the `constructor` keyword or special method name inside structs.
2.  Update `SemanticAnalyzer` to verify that constructors initialize all non-optional fields.
3.  Update `Transpiler` to generate code that allocates memory for the struct and then calls the constructor function with the allocated pointer (as `this`).

## 26. Implement Async/Await for Asynchronous Programming

**Importance:**
Simplifies writing non-blocking code, especially for I/O-bound operations like networking and file access. It avoids "callback hell" and makes asynchronous code look synchronous.

**Implementation Strategy:**

- Implement a state machine transformation for `async` functions.
- Create a runtime scheduler (event loop) to manage tasks.
- Add `async` and `await` keywords.

**Steps:**

1.  Update parser to accept `async frame` and `await` expressions.
2.  Transform `async` functions into state machines (structs holding local variables and execution state).
3.  Implement a basic `Future` or `Promise` trait/interface.
4.  Create a lightweight runtime library to poll futures.

## 27. Add Optional Garbage Collection Support

**Importance:**
Provides an alternative to manual memory management for applications where ease of use and safety are prioritized over raw performance.

**Implementation Strategy:**

- Implement a tracing garbage collector (e.g., Mark-and-Sweep).
- Add a compiler flag (e.g., `--gc`) to enable automatic memory management.
- Insert write barriers and allocation hooks during code generation.

**Steps:**

1.  Design the object header format (mark bits, size).
2.  Implement the allocator and collector in the runtime library.
3.  Update `Transpiler` to use GC allocation functions when the flag is enabled.
4.  Implement stack scanning to find root pointers.

## 28. Implement Reflection API for Runtime Type Inspection

**Importance:**
Allows programs to inspect and manipulate types at runtime. Essential for generic serialization/deserialization libraries (like JSON), dependency injection, and testing frameworks.

**Implementation Strategy:**

- Generate metadata tables for structs and functions during compilation.
- Provide a standard library API to access this metadata (e.g., `reflect.getType(obj)`).

**Steps:**

1.  Define the metadata format (Type ID, Field Names, Offsets).
2.  Emit this metadata into a special section of the binary.
3.  Implement `lib/reflect.x` to parse and expose this data.
4.  Add a `typeof` operator or intrinsic.

## 29. Add Regular Expressions (Regex) Support

**Importance:**
A fundamental tool for text processing, validation, and searching.

**Implementation Strategy:**

- Port a lightweight regex engine (like PCRE or a custom NFA/DFA implementation) to BPL.
- Expose a clean API in the standard library.

**Steps:**

1.  Create `lib/regex.x`.
2.  Implement a parser for regex patterns.
3.  Implement the matching engine (NFA-based for simplicity initially).
4.  Add functions for `match`, `search`, `replace`, and `split`.

## 30. Implement Result<T, E> Pattern for Error Handling

**Importance:**
Provides a type-safe and explicit way to handle errors, avoiding the pitfalls of unchecked exceptions. It forces developers to handle potential failure cases.

**Implementation Strategy:**

- Define a generic `Result<T, E>` enum (requires Enum support).
- Add syntax sugar (like Rust's `?` operator) for propagating errors.

**Steps:**

1.  Define `enum Result<T, E> { Ok(T), Err(E) }` in the standard library.
2.  Update standard library functions to return `Result` instead of throwing exceptions or returning error codes.
3.  Implement the `?` operator in the parser and transpiler to unwrap `Ok` or return `Err`.

## 31. Implement Static Methods for Structs

**Importance:**
Allows grouping related functions under a namespace (the struct name), improving code organization and readability. It enables factory methods (constructors) and utility functions associated with a type.

**Implementation Strategy:**

- Extend struct definition syntax to support `static` methods using the `static` keyword.
- Enforce strict calling conventions:
  - **Type.method()**: Only for static methods.
  - **instance.method()**: Only for instance methods.
- Disallow name collisions between static and instance methods.
- Support generic static methods on generic structs (e.g., `Box<T>.create()`).

**Steps:**

1.  **Parser**: Update `parseStructDeclaration` to recognize `static funcName(...)` (sets `isStatic=true`) and `frame funcName(...)` (sets `isStatic=false`).
2.  **AST/SymbolTable**: Add `isStatic` flag to `FunctionDeclarationExpr` and `FunctionInfo`.
3.  **Semantic Analysis (Declaration)**:
    - Register static methods without `this` parameter.
    - Ensure name uniqueness within the struct (static and instance share namespace).
4.  **Semantic Analysis (Call)**:
    - In `analyzeMethodCall`, distinguish between Type receiver and Instance receiver.
    - Error if calling instance method on Type.
    - Error if calling static method on Instance.
    - Handle `GenericStruct<T>.staticMethod()` by monomorphizing the static method with `T`.
5.  **Transpiler**:
    - Generate static method definitions without `this`.
    - Generate static method calls without passing a receiver.

## 32. Implement Stack Traces for Errors

**Importance:**
Crucial for debugging. When an error occurs (exception or crash), knowing the call stack helps pinpoint exactly where and why it happened.

**Implementation Strategy:**

- Maintain a shadow stack or use frame pointers to walk the stack at runtime.
- Generate a mapping of instruction addresses to source lines (debug info).
- Enhance the `Error` struct to hold stack information.

**Steps:**

1.  Implement a runtime function `__capture_stack_trace` that walks the stack frames.
2.  Update the `throw` mechanism to call this function and store the result in the exception object.
3.  Implement `print_error` in the standard library to format and print the stack trace using debug info (if available) or raw addresses.
4.  (Optional) Add a compiler flag to enable/disable stack trace generation for performance.
