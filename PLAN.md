# Pending Features

This document outlines the pending features for the BPL compiler, prioritized by their importance and complexity. Each item includes a description, implementation notes, and acceptance criteria.

Priority levels: 0 = Highest Priority, 9 = Lowest Priority

---

## [1] Advanced Generics (Constraints, Inference)

**Description:** Add generic constraints (e.g., `T: Comparable`) and local inference so generic functions can deduce type parameters from call-sites where possible. This feature enables developers to write more restrictive and reusable generic code by specifying what capabilities a type parameter must have. Generic type inference allows developers to omit explicit type arguments in many cases where they can be determined from context, reducing boilerplate.

**Implementation Notes:**

- Extend type parameter structures to include bounds/constraints
- Implement constraint checking during type inference and resolution
- Add unification and constraint propagation algorithm to TypeChecker
- Build a trait/interface system that constraints can reference
- Implement bidirectional type inference to deduce type arguments from usage
- Create error messages that explain why a type doesn't satisfy a constraint

**Acceptance Criteria:**

- Constrained generics accept only types satisfying bounds and reject invalid types with clear errors
- Generic functions without explicit type args can be called with types that infer correctly
- Constraint violations are reported with helpful diagnostics
- Examples demonstrate practical use cases (e.g., sorting with Comparable constraint)

---

## [1] Operator Overloading for User Types

**Description:** Let user-defined types implement special methods (dunder-style like `__add__`, `__eq__`) that override built-in operator behavior for instances. This makes custom types (like Vector, Complex, BigInt) feel like first-class citizens by allowing them to be used with familiar operators. Operators become syntactic sugar for method calls, making code more intuitive and readable.

**Implementation Notes:**

- Define comprehensive mapping between all operators and their corresponding method names
- During type-checking, detect operator usage and check if operand type has corresponding method
- Resolve to the method if it exists, otherwise fall back to builtin semantics or error
- Implement operator resolution with support for implicit type conversions (coercions)
- Handle both unary and binary operators
- Disallow overloading of assignment operators (=, +=, etc.) to maintain consistency
- Support left/right operand dispatch for binary operators
- Generate clear error messages for ambiguous overloads

**Acceptance Criteria:**

- Defining `__add__` on a struct causes `a + b` to call that method
- Operator resolution respects type conversions and precedence rules
- Ambiguous or invalid overloads produce helpful error messages
- User-defined types can be used naturally with standard operators (arithmetic, comparison, logical)
- Assignment operators remain non-overloadable for safety

---

## [3] Root Global `Type` Struct

**Description:** Define a root `Type` struct that every user-defined struct implicitly inherits from, providing methods like `getTypeName()`, `getSize()`, `toString()`, and basic equality. This creates a unified type hierarchy where all objects share common capabilities, enabling polymorphic code that works with any type and providing runtime type information.

**Implementation Notes:**

- Design the core `Type` struct with essential runtime information
- Inject implicit inheritance of `Type` for every user-defined struct during semantic analysis
- Implement common methods as part of the runtime/stdlib (`getTypeName()`, `getSize()`, `equals()`, `hashCode()`, etc.)
- Ensure proper method virtual dispatch and override semantics
- Generate type metadata tables for reflection at runtime
- Handle inheritance chains correctly (user struct -> Type)
- Support method overriding in user code for virtual methods

**Acceptance Criteria:**

- Any struct can call `getTypeName()` and receive the correct type name
- Common operations are available without explicit inheritance in source code
- Type metadata is available at runtime for introspection
- Objects maintain proper polymorphic behavior through the type hierarchy
- Methods can be overridden to customize behavior

---

## [3] Primitive Types as Structs Inheriting `Primitive`

**Description:** Model primitive types (int, float, bool, char) as structs inheriting from a `Primitive` base, exposing operations as methods to unify the type system. This eliminates the distinction between primitive and user-defined types, allowing primitives to have methods and follow the same protocols as user types while maintaining performance through specialized handling.

**Implementation Notes:**

- Create a `Primitive` base struct with common methods for all primitive types
- Represent primitives specially in the type system for performance optimization
- Provide method dispatch wrappers for primitive operations (e.g., `int_val.toString()`, `float_val.abs()`)
- Balance performance through inlining and specialization with uniformity through object-like method access
- Generate efficient code paths for primitives while maintaining polymorphic behavior
- Support method calls on primitive literal values
- Ensure operators and methods interoperate seamlessly

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

## [2] Enum Types and Pattern Matching

**Description:** Implement enum types (including tagged unions with associated data) with exhaustive pattern matching support. This enables type-safe state representation and powerful control flow based on data variants, replacing many use cases for conditionals with cleaner pattern matching.

**Implementation Notes:**

- Add enum keyword and syntax for variant definitions with optional associated data
- Implement discriminant-based storage for enum values
- Add match expression syntax with pattern syntax for destructuring variants
- Implement exhaustiveness checking to ensure all variants are handled
- Support pattern guards and nested patterns
- Handle enum inheritance and variance rules
- Support enum methods similar to structs
- Implement error messages for non-exhaustive patterns

**Acceptance Criteria:**

- Enums with and without associated data compile correctly
- Match expressions validate that all cases are handled
- Compiler errors on non-exhaustive patterns
- Pattern matching destructures associated data correctly
- Enum methods work as expected
- Examples demonstrate practical use cases (Option, Result, State machines)

---

## [2] Interfaces/Traits

**Description:** Add interface (or trait) definitions that describe method contracts, enabling polymorphism and code reuse. Structs can implement multiple interfaces, providing type-safe generic programming and dynamic dispatch capabilities.

**Implementation Notes:**

- Define interface syntax with method signatures (no implementation)
- Implement semantic checking to validate struct implementations
- Support trait bounds in generic parameters (e.g., `T: Comparable`)
- Implement dispatch mechanism (v-tables for dynamic, monomorphization for static)
- Handle interface inheritance and method conflicts
- Implement interface casting and type checks
- Generate vtable code during codegen
- Support default implementations in future enhancement

**Acceptance Criteria:**

- Structs can implement one or more interfaces
- Interface methods are callable on interface types
- Type checking validates that implementations match interface signatures
- Generic code can use trait bounds to constrain types
- Dispatch works correctly (both static and dynamic)
- Examples show polymorphic behavior and code reuse

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

## [4] Enhanced Error Messages with Location Information

**Description:** Improve all compiler error, warning, and note messages to include precise file:row:column location information and contextual details. This dramatically improves the debugging experience by making errors immediately locatable in code and providing clear guidance on fixes.

**Implementation Notes:**

- Ensure all AST nodes capture source location (file path, line number, column)
- Implement consistent error formatting with file:row:column prefix
- Add code snippet display showing the problem line with visual indicators
- Include column markers (^) pointing to exact problem location
- Provide "help" or "hint" messages suggesting fixes
- Support colorized output for terminal compatibility
- Group related errors and include context from previous passes
- Add "note" messages for additional context
- Track error chains for cascading errors
- Implement machine-readable error format for IDE integration

**Acceptance Criteria:**

- Every error message includes file:row:column format
- Error output includes relevant code snippet with visual indicators
- Column position of error is clearly marked
- Related errors are grouped logically
- Helpful suggestions or hints guide users toward fixes
- Warnings and notes are clearly distinguished from errors
- Output is colorized for better readability
- IDE integration works with error format

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
