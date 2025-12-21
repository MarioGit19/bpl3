# Pending Features

This document outlines the pending features for the BPL compiler, prioritized by their importance and complexity. Each item includes a description, implementation notes, and acceptance criteria.

Priority levels: 0 = Highest Priority, 9 = Lowest Priority

---

## 🎯 RECOMMENDED NEXT STEPS

The following features are recommended for implementation next:

### 1. **Multi-Target Support** [Priority 3] 🌍 CROSS-PLATFORM

- **Why:** Enables compiling for different architectures (x86, ARM) and OSs
- **Impact:** Broader reach for BPL applications
- **Use cases:** Cross-compilation, embedded systems
- **Complexity:** High (requires backend abstraction)

### 2. **Closures and Lambda Expressions** [Priority 4] 🧩 FUNCTIONAL PROGRAMMING

- **Why:** Essential for modern functional programming patterns
- **Impact:** Cleaner callback APIs, higher-order functions
- **Use cases:** Event handling, functional algorithms (map/filter/reduce)
- **Complexity:** High (requires capture analysis and closure conversion)

---

## 📋 COMPLETED FEATURES

---

## [1] ✅ Enum Types and Pattern Matching (COMPLETED)

**Description:** Implement enum types (including tagged unions with associated data) with exhaustive pattern matching support. This enables type-safe state representation and powerful control flow based on data variants.

**Implementation Status:** ✅ Fully Implemented (December 2025)

**What Was Implemented:**

- ✅ Enum declaration with unit, tuple, and struct variants
- ✅ Generic enums
- ✅ Match expressions with exhaustiveness checking
- ✅ Pattern guards (`if` conditions in match arms)
- ✅ Enum methods and equality operators
- ✅ Recursive enums (via pointers)
- ✅ LLVM IR generation for tagged unions
- ✅ Explicit returns in match arms (blocks returning values)

---

## [2] ✅ Operator Overloading for User Types (COMPLETED)

**Description:** Let user-defined types implement special methods (dunder-style like `__add__`, `__eq__`) that override built-in operator behavior for instances. This makes custom types (like Vector, Complex, BigInt) feel like first-class citizens by allowing them to be used with familiar operators. Operators become syntactic sugar for method calls, making code more intuitive and readable.

**Implementation Status:** ✅ Fully Implemented

---

## [2] ✅ Generic-Aware Operator Resolution (COMPLETED)

**Description:** Enable operator overloading to work with generic types by making operator resolution happen after generic type substitution. Generic structs like `Array<T>`, `Stack<T>`, `Queue<T>`, etc. can now use operator overloading with full type parameter substitution support.

**Implementation Status:** ✅ Fully Implemented (December 2025)

**What Was Implemented:**

- ✅ TypeChecker enhancement: Generic type substitution for operator methods
- ✅ CodeGenerator enhancement: Correct monomorphized method name generation
- ✅ Fixed nested generic type resolution (e.g., `Array<Pair<K,V>>`)
- ✅ All stdlib generic types updated with operators:
  - Array<T>: `<<` (push), `>>` (pop)
  - Stack<T>: `<<` (push)
  - Queue<T>: `<<` (enqueue)
  - Map<K,V>: `==`, `!=`
  - Set<T>: `|` (union), `&` (intersection), `-` (difference), `==`, `!=`
  - Option<T>: `==`, `!=`
  - Result<T,E>: `==`, `!=`
  - Vec2/Vec3: Full arithmetic operators

**Examples:**

- `examples/operator_overloading_generic/` - Generic operator overloading tests
- `examples/operator_overloading_minimal/` - Minimal generic test
- `examples/operator_overloading_simple/` - Multiple operators and types
- `examples/stdlib_operator_overloading/` - Comprehensive stdlib operators test

**Tests:**

- All 139 integration tests passing
- Operators work correctly with concrete generic instantiations
- Nested generics properly resolved

**Documentation:**

- `docs/generic-operator-implementation-complete.md` - Implementation details
- `docs/STDLIB_OPERATORS.md` - Complete operator reference for stdlib

---

## [1] ✅ Operator Overloading for User Types (COMPLETED)

**What Was Implemented:**

- ✅ Comprehensive mapping of 24 operators to dunder methods (`__add__`, `__sub__`, `__mul__`, `__div__`, `__mod__`, `__and__`, `__or__`, `__xor__`, `__lshift__`, `__rshift__`, `__eq__`, `__ne__`, `__lt__`, `__gt__`, `__le__`, `__ge__`, `__neg__`, `__not__`, `__pos__`, `__get__`, `__set__`, `__call__`)
- ✅ TypeChecker phase: Detects operator usage and annotates AST with operator overload metadata
- ✅ CodeGenerator phase: Transpiles operators to method calls for overloaded operators
- ✅ Support for binary operators (+, -, \*, /, %, &, |, ^, <<, >>)
- ✅ Support for comparison operators (==, !=, <, >, <=, >=)
- ✅ Support for unary operators (-, ~, +) - prefix only
- ✅ Support for indexing operator ([] via `__get__` and `__set__`)
- ✅ Support for call operator (() via `__call__`)
- ✅ Proper error messages for missing or invalid operator overloads
- ✅ Assignment operators remain non-overloadable (compound assignments use read + operator + write)

**Examples:**

- `examples/operator_overloading/` - Basic operators (Vector2D, Complex, Callable)
- `examples/operator_overloading_arithmetic/` - Division, modulo (Rational, ModInt)
- `examples/operator_overloading_bitwise/` - Bitwise and comparison operators (BitSet, Integer)

**Tests:**

- 14 unit tests in `tests/OperatorOverloading.test.ts`
- 5 error test cases in `examples/errors/operator_overloading_errors/`
- All integration tests passing

---

## [3] ✅ Root Global `Type` Struct (COMPLETED)

**Description:** Define a root `Type` struct that every user-defined struct implicitly inherits from, providing methods like `getTypeName()`, `getSize()`, `toString()`, and basic equality. This creates a unified type hierarchy where all objects share common capabilities, enabling polymorphic code that works with any type and providing runtime type information.

**Implementation Status:** ✅ Fully Implemented (December 2025)

**What Was Implemented:**

- ✅ `Type` struct in `std` module
- ✅ Implicit inheritance: All user structs inherit from `Type`
- ✅ Virtual method dispatch for `toString()`, `equals()`, `hashCode()`
- ✅ Runtime Type Information (RTTI) basics
- ✅ Cross-module method resolution for inherited methods

**Acceptance Criteria:**

- Any struct can call `getTypeName()` and receive the correct type name
- Common operations are available without explicit inheritance in source code
- Type metadata is available at runtime for introspection
- Objects maintain proper polymorphic behavior through the type hierarchy
- Methods can be overridden to customize behavior

---

## [3] ✅ Primitive Types as Structs (COMPLETED)

**Description:** Model primitive types (int, float, bool, char) as structs inheriting from a `Primitive` base, exposing operations as methods to unify the type system. This eliminates the distinction between primitive and user-defined types, allowing primitives to have methods and follow the same protocols as user types while maintaining performance through specialized handling.

**Implementation Status:** ✅ Fully Implemented (December 2025)

**What Was Implemented:**

- ✅ Wrapper structs `Int`, `Bool`, `Double` in `std` module
- ✅ Compiler mapping from primitive types (`i32`, `i1`, `f64`) to wrapper structs
- ✅ Method calls on primitive variables and literals (e.g., `42.toString()`)
- ✅ `CallChecker` logic to resolve primitive members to wrapper struct members
- ✅ `CodeGenerator` support for primitive member access

**Acceptance Criteria:**

- Primitive methods are callable on variables and literals
- Primitive methods interoperate correctly with language operators
- Code like `(42).toString()` and `3.14.abs()` compiles and runs correctly
- Performance-sensitive paths maintain efficiency through compiler optimizations
- Primitives follow the same method resolution rules as user-defined types

---

## [3] Multi-Target Support

**Description:** Add support for targeting multiple platforms and architectures (x86/x64/ARM, Linux/Windows/macOS) and provide conditional stdlib methods for platform differences. This enables developers to write code once and compile it for multiple targets, with transparent handling of platform-specific differences.

**Implementation Notes:**

- Define a target abstraction layer that decouples frontend from backend
- Implement target triples (architecture-os-abi format) for different platforms
- Create platform-specific codegen paths for different architectures
- Abstract syscall/ABI differences through a runtime layer
- Implement conditional compilation based on target platform
- Provide platform detection macros/constants in stdlib
- Support different calling conventions per architecture
- Handle register allocation and instruction selection per target

**Acceptance Criteria:**

- Compiler can emit different target outputs (x86, ARM, etc.)
- Same source code compiles successfully for multiple platforms
- Small example programs run correctly on at least two different target architectures
- Platform-specific stdlib functions work correctly
- Build system allows specifying target platforms

---

## [5] Type Narrowing / Pattern Matching

**Description:** Implement syntax and semantics for narrowing variable types based on runtime checks (useful inside `catch` blocks or generic contexts). This allows developers to work with more specific types after validation, enabling type-safe handling of polymorphic values and optional types.

**Implementation Notes:**

- Add a `match<T>(expr)` or `as<T>(expr)` AST construct for type narrowing
- Implement TypeChecker rules to narrow variable types inside block scope
- Ensure RTTI (Runtime Type Information) support for runtime checks
- Support type guards and runtime type checks
- Implement proper control flow analysis for narrowing
- Support narrowing based on null checks, type tests, and guards
- Generate runtime checks to validate type narrowing
- Handle narrowing in different scopes correctly

**Acceptance Criteria:**

- Within a `match<T>(v)` block, `v` is considered to have type `T`
- Member accesses and overloads resolve using the narrowed type
- Runtime validation ensures safety of type narrowing
- Narrowing works in catch blocks and generic contexts
- Clear error messages when narrowing to incompatible types

---

## [5] Linting Tool

**Description:** Provide static analysis tooling to detect style issues, potential bugs, and code quality problems (unused variables, suspicious casts, missing returns, unreachable code). This helps developers maintain code quality and catch bugs early without running the program.

**Implementation Notes:**

- Reuse existing AST and TypeChecker infrastructure
- Implement individual lint rules as separate checkers
- Make all rules configurable (enable/disable, severity levels)
- Add autofix capabilities for simple, safe transformations
- Support configuration files for project-wide settings
- Implement rules for: unused variables, unreachable code, type mismatches, missing returns, shadowing
- Integrate with compiler diagnostic system
- Support suppression comments for false positives

**Acceptance Criteria:**

- Linter runs successfully on projects
- Reports actionable warnings with clear messages and locations
- Autofix feature works for common issues (unused imports, obvious type errors)
- Rules are configurable per-project
- Output integrates well with IDE and build tools

---

## [5] Documentation Generation Tool

**Description:** Tool to parse source comments and generate API documentation (HTML/Markdown) for language, libraries, and runtime. This enables projects to produce professional API documentation automatically from source code, improving accessibility and maintainability.

**Implementation Notes:**

- Reuse the parser/AST to extract doc comments and signatures
- Support multiple comment formats (JSDoc-style, Rustdoc-style)
- Extract type signatures, parameters, return types, examples
- Provide templates for different output formats (HTML, Markdown, etc.)
- Add command-line options for customizing output
- Su6] Allow Structs to Inherit Primitives

**Description:** Permit `struct MyInt : int { ... }` so a struct can behave as a primitive type with additional methods/fields. This enables creating specialized primitive types with domain-specific methods while maintaining compatibility with code expecting the base primitive type.

**Implementation Notes:**

- Carefully design memory layout to ensure compatibility with base primitive
- Implement type compatibility rules: instances of `MyInt` must be usable where `int` is expected
- Implement implicit conversion rules (MyInt -> int when needed)
- Handle method overriding semantics for primitive methods
- Consider specialization in codegen for performance
- Generate efficient code that doesn't add overhead for the wrapper struct
- Support field additions on top of primitive base
- Handle constructors and conversions properly

**Acceptance Criteria:**

- `MyInt` instances can be passed to APIs expecting `int`
- Struct can add methods to the primitive type
- Memory layout is compatible with base primitive type
- Overrides of primitive methods are callable
- Performance remains acceptable (no unnecessary boxing/unboxing)
- Documentation covers the stdlib and sample modules
- Output includes function signatures, parameters, return types
- Documentation includes code examples
- Generated docs are properly styled and navigable

---

## [7] Allow Structs to Inherit Primitives

**Description:** Permit `struct MyInt : int { ... }` so a struct can behave as a primitive type with additional methods/fields.

**Implementation Notes:** Carefully design memory layout and type compatibility: instances of `MyInt` must be usable where `int` is expected. Implement implicit conversion rules and method overriding semantics. Consider specialization in codegen for performance.

**Acceptance Criteria:** `MyInt` instances can be passed to APIs expecting `int`; overrides of primitive methods are callable.

---

## [8] Const Correctness

**Description:** Enforce `const` (or equivalent) declarations and immutability rules across the language: constant variables, read-only fields, `const` parameters, and compile-time constants. This prevents accidental mutations and enables compiler optimizations while making developer intent explicit.

**Implementation Notes:**

- Add `isConst` flag to symbol/type entries throughout the compiler
- Propagate const through assignments, parameter passing, and returns
- Implement proper const type qualifiers
- Treat `const` references to mutable objects as shallowly const initially
- Decide and document const semantics (deep vs shallow)
- Support compile-time constants and const folding
- Generate errors on attempted mutation of const values
- Support const promotion where safe
- Handle mutable borrows of const values correctly

**Acceptance Criteria:**

- Examples declaring `const` variables produce errors on mutation attempts
- `const` parameters cannot be assigned inside functions
- `const` globals evaluate as compile-time constants where used
- Proper error messages guide users on const correctness
- Compiler can optimize based on const information

---

## [8] Async/Await

**Description:** Add `async` functions and `await` operator with promise-like semantics to simplify asynchronous programming. This makes non-blocking I/O and concurrent operations feel natural and avoids callback hell, enabling readable asynchronous code.

**Implementation Notes:**

- Decide between transpiling async into callback-based state machines or using runtime coroutines
- Implement state machine transformation for `async` functions
- Create proper Future/Promise types and runtime support
- Implement event loop integration for executing async tasks
- Support proper error handling in async contexts
- Implement `await` operator for suspending and resuming execution
- Handle spawning and joining of async tasks
- Ensure memory safety in concurrent contexts
- Provide debugging support for async code

**Acceptance Criteria:**

- `async` functions return a `Future`/`Promise` type
- `await` operator suspends/resumes correctly
- Asynchronous examples compile and run correctly
- Multiple concurrent tasks can run and complete
- Error handling works properly in async contexts

---

## [8] Threading Support

**Description:** Provide language primitives to create and manage threads, synchronization primitives, and safe concurrency patterns. This enables multi-threaded programs that can utilize multiple CPU cores while maintaining thread safety and preventing race conditions.

**Implementation Notes:**

- Integrate with target threading primitives (pthreads on POSIX, WinAPI on Windows)
- Define clear memory model for concurrent access
- Implement synchronization primitives (Mutex, RwLock, Semaphore)
- Provide atomic operations for lock-free programming
- Implement thread spawning and joining
- Add support for thread-local storage
- Create standard library APIs for thread management
- Ensure safe concurrency through type system where possible
- Implement proper cleanup and resource management

**Acceptance Criteria:**

- Spawn and join threads correctly
- Synchronized access examples behave correctly
- Mutex and other synchronization primitives work properly
- Race conditions are prevented
- Threads can communicate safely through channels or queues

---

## [8] Inline Assembly Blocks

**Description:** Allow embedding inline assembly with explicit register lists and integration with calling conventions. This enables developers to write performance-critical code or access CPU features that aren't exposed through the language.

**Implementation Notes:**

- Add parser support for inline assembly syntax
- Create safe lowered representation for assembly blocks
- Implement proper integration with calling conventions
- Support explicit register constraints and clobber lists
- Validate register usage and detect conflicts
- Generate correct inline assembly in LLVM IR or native codegen
- Support input/output constraints for variables
- Implement proper type checking for assembly operands
- Generate warnings for platform-specific assembly

**Acceptance Criteria:**

- `asm [rax, rbx] { ... }` syntax compiles correctly
- Inline assembly is properly injected into compiled code
- Register constraints are validated
- Inline assembly interoperates with normal code
- Documentation covers constraints and usage patterns

---

## [9] Semantic Analysis Improvements

**Description:** Enhance the TypeChecker and semantic analysis to catch more errors at compile time, such as unreachable code, variable shadowing, and unused variables. This improves code quality and helps developers catch bugs early in development.

**Implementation Notes:**

- Add control flow analysis passes for detecting unreachable code
- Implement scope analysis for detecting variable shadowing
- Add unused variable/parameter detection
- Detect unused function definitions
- Implement type consistency checking across code paths
- Add missing initialization detection
- Implement exhaustiveness checking for pattern matching
- Add warnings for suspicious type conversions
- Create configurable warning levels

**Acceptance Criteria:**

- Compiler warns or errors on unreachable code
- Shadowed variables are detected and reported
- Unused variables and functions are flagged
- Clear messages guide developers to issues
- Warnings can be individually configured or suppressed

---

## [2] Generic-Aware Operator Resolution

**Description:** Enable operator overloading to work with generic types by making operator resolution happen after generic type substitution. Currently, operators don't work with generic structs like `Array<T>` because the compiler looks up operators before substituting the generic type parameter. This limitation prevents ergonomic APIs for generic containers (e.g., `arr << value` for push).

**Implementation Status:** ❌ Not Started (Documented limitation)

**The Problem:**

When you write `arr << 10` where `arr` is `Array<i32>`, the compiler:

1. Sees operator `<<` with left operand type `Array<i32>`
2. Looks up `__lshift__` method on the struct named `Array<i32>`
3. Fails because the struct is actually named `Array` with generic parameter `T`
4. Never finds the `__lshift__(this: *Array<T>, value: T)` method

The operator resolution happens before generic type substitution, so it never sees the concrete instantiated type.

**Implementation Notes:**

**Phase 1: Analysis and Design**

- Review current operator resolution algorithm in TypeChecker
- Identify where generic type substitution happens relative to operator lookup
- Design new "generic-aware" operator resolution that delays lookup
- Consider performance implications of deferred operator resolution

**Phase 2: Core Changes**

- Modify operator resolution to detect when operand type is a generic instantiation
- Add tracking for generic type parameters during operator lookup
- Implement deferred operator resolution that happens after type substitution
- May need to add a separate compilation pass for generic operator instantiation

**Phase 3: Type System Integration**

- Ensure operator methods on generic types are properly indexed
- Handle method lookup with substituted type parameters
- Support operator overload resolution with type inference
- Maintain backward compatibility with non-generic operator overloads

**Phase 4: Error Handling**

- Generate clear error messages when operator method is missing on concrete type
- Distinguish between "no operator method defined" vs "wrong type parameters"
- Provide helpful suggestions for fixing operator overload issues

**Technical Challenges:**

- Operator resolution currently happens early in TypeChecker for performance
- Generic type substitution happens later during monomorphization
- Need to either: (a) delay all operator resolution, or (b) re-resolve operators after substitution
- Must maintain type safety and prevent ambiguous overload situations

**References:**

- See `docs/operator-overloading-generics-limitation.md` for detailed technical analysis
- Current workaround: Use concrete types (e.g., `IntArray`) instead of generics
- Alternative workaround: Use explicit method calls (`arr.push(value)`) instead of operators

**Acceptance Criteria:**

- Generic structs can define operator methods that work with type parameters
- `Array<T>` can implement `__lshift__(this: *Array<T>, value: T)` successfully
- Code like `arr << 10` where `arr: Array<i32>` compiles and calls the correct method
- Operator resolution correctly finds methods on instantiated generic types
- Error messages clearly indicate when operator overloading fails on generic types
- Type inference works correctly with generic operator overloads
- Performance remains acceptable (no significant compilation slowdown)
- All existing operator overloading tests continue to pass
- New integration tests demonstrate generic operators working with Array<T>, Vec<T>, etc.

---

## [4] Closures and Lambda Expressions

**Description:** Implement anonymous functions with automatic capture of variables from enclosing scope. This enables functional programming patterns, callback-based APIs, and higher-order functions while maintaining type safety and memory safety.

**Implementation Notes:**

- Add lambda syntax (e.g., `|x, y| x + y` or `func(x, y) => x + y`)
- Analyze captured variables in semantic analysis phase
- Generate hidden closure struct containing captured variables
- Transform lambda call into method call on closure struct
- Handle move semantics vs borrow semantics for captures
- Support closure type inference
- Implement closure type checking
- Handle nested closures correctly

**Acceptance Criteria:**

- Lambdas capture local variables correctly
- Captured variables have appropriate lifetimes
- Closures can be passed as function arguments
- Type checking works for closure parameters and returns
- Closures work with higher-order functions (map, filter, etc.)
- Examples demonstrate functional programming patterns

---

## [7] Defer Statement

**Description:** Implement defer keyword for guaranteed execution of cleanup code when a scope exits. This simplifies resource management and ensures cleanup happens even with early returns or exceptions.

**Implementation Notes:**

- Add defer keyword and statement parsing
- Track deferred statements in scope stack during transpilation
- Inject deferred code at all exit points (return, break, normal exit)
- Execute deferred statements in reverse order (LIFO)
- Handle defer with exceptions and error propagation
- Support defer in all block scopes
- Generate proper cleanup even with multiple returns
- Implement defer in try blocks and other special contexts

**Acceptance Criteria:**

- Deferred statements execute when scope exits
- Multiple defer statements execute in reverse order
- Works correctly with early returns
- Works correctly with exceptions
- Examples demonstrate resource cleanup patterns
- Cleanup code runs reliably in all exit paths

---

## [7] Module Visibility and Access Control

**Description:** Add public/private visibility modifiers and module-level encapsulation to control API exposure. This enables proper abstraction boundaries and library design while hiding implementation details.

**Implementation Notes:**

- Add pub/private keywords to declarations
- Implement visibility checking in semantic analysis
- Support module-level exports (pub use)
- Handle re-exports and visibility composition
- Implement visibility for structs, functions, and fields
- Support internal visibility for same-module access
- Generate proper error messages for visibility violations
- Handle visibility in generic instantiation

**Acceptance Criteria:**

- Private items are not accessible from outside their module
- Public items are accessible as expected
- Field visibility is enforced
- Module exports properly control public API
- Clear error messages on visibility violations
- Examples demonstrate proper encapsulation patterns

---

## [9] REPL (Read-Eval-Print Loop)

**Description:** Implement an interactive shell for rapid prototyping, learning, and testing code snippets. The REPL provides immediate feedback and maintains state across expressions, making the language more approachable and enabling exploratory programming.

**Implementation Notes:**

- Create interactive input loop with proper line handling
- Reuse parser and compiler for parsing REPL input
- Implement statement vs expression handling
- Use JIT compilation or interpretation for immediate execution
- Maintain global scope and variable bindings across lines
- Handle multi-line input gracefully
- Display expression results automatically
- Support special commands (help, clear, exit, etc.)

**Acceptance Criteria:**

- REPL accepts and executes statements and expressions
- Results are displayed after each line
- State persists across lines (variables remain accessible)
- Multi-line input works correctly
- Special commands are available
- Examples demonstrate interactive exploration

---

## [9] Reflection API

**Description:** Provide runtime type inspection and reflection capabilities for accessing type metadata, field information, and method signatures. This enables generic serialization, dependency injection, testing frameworks, and other metaprogramming use cases.

**Implementation Notes:**

- Generate metadata tables during compilation for all types
- Emit metadata into binary (special section or data)
- Create stdlib module with reflection APIs (Type, Field, Method info)
- Implement type ID generation and comparison
- Support field name and offset lookup
- Provide method signature and parameter information
- Implement iteration over fields and methods
- Handle inheritance and method overrides in reflection

**Acceptance Criteria:**

- Runtime type information available for all types
- Can reflect on fields and get names, types, offsets
- Can reflect on methods and get signatures
- Iteration over type members works
- Generic serialization can be implemented using reflection
- Examples show reflection in action (JSON serialization, etc.)

---

## [9] Result&lt;T, E&gt; Type and Error Propagation

**Description:** Implement a Result enum type for type-safe error handling and add the ? operator for convenient error propagation. This provides an alternative to exceptions with explicit error handling that prevents error silence and improves code reliability.

**Implementation Notes:**

- Define Result<T, E> enum in standard library
- Implement ? operator in parser and transpiler
- Add semantics: ? unwraps Ok or returns Err from current function
- Support Result in function return types
- Implement ergonomic error conversion
- Add Into trait for automatic error conversion
- Provide combinators in stdlib (map, and_then, or_else, etc.)
- Handle Result with async/await

**Acceptance Criteria:**

- Result<T, E> enum works as expected
- ? operator propagates errors correctly
- Functions returning Result integrate smoothly with ? operator
- Error types convert appropriately
- Examples show error handling patterns (using Result instead of exceptions)
- Combinators enable clean error handling chains

---

## [9] Macro System

**Description:** Implement compile-time code generation through procedural macros. This enables metaprogramming, reducing boilerplate code, creating DSLs, and extending the language with domain-specific syntax.

**Implementation Notes:**

- Define macro syntax (e.g., `macro_rules!` or `#[macro]`)
- Implement macro expansion phase before semantic analysis
- Provide AST manipulation API for macros
- Support pattern matching in macro definitions
- Implement hygiene to prevent variable name collisions
- Support recursive macros with depth limits
- Provide debugging support for macro expansion
- Implement error reporting within macros

**Acceptance Criteria:**

- Macros can be defined and called
- Macros correctly generate code
- Macro pattern matching works
- Generated code is semantically correct
- Hygiene prevents accidental variable capture
- Examples demonstrate practical macro use cases (derive, builders, DSLs)

---

## [9] Source Code Display for Eval/Stdin Errors

**Description:** Fix error message code snippets when compiling from stdin (`--stdin`) or eval mode (`-e`). Currently, when an error occurs in code compiled from these sources, the error formatter attempts to read the source from a file that doesn't exist or accidentally reads binary data from compiled executables with similar names (e.g., `stdin-42069`), resulting in garbled output.

**The Problem:**

When using `--stdin` or `-e`, the compiler assigns fake file paths like `stdin-42069` or `eval-42069` to track the source. However, the `CompilerError` class tries to read these as real files to display code snippets. This causes:

1. Binary data display when a compiled executable with that name exists
2. Empty/missing code snippets when no file exists
3. Poor user experience for interactive/piped compilation

**Implementation Notes:**

There are several approaches to fix this:

**Option 1: Thread source through CompilerError (Preferred)**

- Modify `CompilerError` constructor to accept optional `sourceLines: string[]` parameter
- When compiling from stdin/eval, capture the source and pass it to error constructors
- Store source in a global context or thread it through the compilation pipeline
- Modify all places that create `CompilerError` to optionally provide source

**Option 2: Source cache by file path**

- Create a global `SourceCache` that maps file paths to source content
- When compiling stdin/eval, register the source in the cache with the fake path
- Modify `CompilerError.loadSourceLines()` to check the cache before reading from disk
- Clear cache after compilation to avoid memory leaks

**Option 3: Virtual file system**

- Create an abstraction layer for file reading that supports "virtual" files
- Register stdin/eval sources as virtual files in this system
- Update all file reading throughout the compiler to use this abstraction

**Acceptance Criteria:**

- Errors from `bpl --stdin` display the actual source code line with proper highlighting
- Errors from `bpl -e "code"` show the code that was passed
- No binary data or garbled text appears in error messages
- Column indicators (^^^) correctly point to error locations
- Solution doesn't significantly complicate the codebase
- Memory usage remains reasonable (no unbounded caching)
