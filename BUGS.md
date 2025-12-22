# BPL Compiler Bug Report

This file tracks bugs and edge cases found during comprehensive testing.

## Summary

| ID      | Category            | Description                                                                                                              | Status  |
| ------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------- | ---------------------------------------------------------------- |
| BUG-001 | Primitive Types     | Integer literal overflow is not detected (e.g., `i8 = 128`).                                                             | Open    |
| BUG-002 | Arithmetic          | Division by zero in constant expressions is not detected (e.g., `1 / 0`).                                                | Open    |
| BUG-003 | Structs             | Recursive structs without pointers are accepted (infinite size).                                                         | Fixed   |
| BUG-004 | Functions           | Duplicate parameter names are accepted in function declarations.                                                         | Fixed   |
| BUG-005 | Arrays              | Zero-sized arrays are accepted (`Type[0]`).                                                                              | Fixed   |
| BUG-006 | Arrays              | Negative array sizes cause parser error instead of semantic error.                                                       | Fixed   |
| BUG-007 | Control Flow        | Duplicate cases in switch statements are accepted.                                                                       | Fixed   |
| BUG-008 | Scoping             | Variable shadowing in the same scope is accepted.                                                                        | Fixed   |
| BUG-009 | Control Flow        | Unreachable code after return is accepted.                                                                               | Fixed   |
| BUG-010 | Analysis            | Unused variables are accepted without warning or error.                                                                  | Fixed   |
| BUG-011 | Type System         | Invalid type casts (e.g., `i32` to `string`) are accepted.                                                               | Fixed   |
| BUG-012 | Structs             | Struct literals with missing fields are accepted (uninitialized memory).                                                 | Fixed   |
| BUG-013 | Control Flow        | Switch statements accept floating point values.                                                                          | Fixed   |
| BUG-014 | Analysis            | `sizeof<void>` is accepted.                                                                                              | Fixed   |
| BUG-015 | Arithmetic          | Modulo operator `%` is accepted for floating point types.                                                                | Fixed   |
| BUG-016 | Arrays              | Array indexing with floating point values is accepted.                                                                   | Fixed   |
| BUG-017 | Operators           | Unary negation `-` is accepted for strings.                                                                              | Fixed   |
| BUG-018 | Operators           | String subtraction `"a" - "b"` is accepted.                                                                              | Fixed   |
| BUG-019 | Assignment          | Assignment to r-values (literals, expressions) is accepted.                                                              | Fixed   |
| BUG-020 | Runtime             | Array out of bounds access returns garbage instead of crashing or erroring.                                              | Fixed   |
| BUG-021 | Runtime             | Division by zero causes silent crash (exit code 1) without error message.                                                | Fixed   |
| BUG-022 | Runtime             | Stack overflow causes silent crash (exit code 1) without error message.                                                  | Fixed   |
| BUG-023 | Syntax              | Struct definitions require a trailing comma for the last field.                                                          | Open    |
| BUG-024 | Syntax              | Generic struct literals `Box<i32> { ... }` are not supported.                                                            | Open    |
| BUG-025 | Syntax              | Trailing commas in function calls `foo(1, 2,)` are not supported.                                                        | Open    |
| BUG-026 | Runtime             | Structs have hidden overhead (null bit) increasing `sizeof` unexpectedly.                                                | Ignored | # this is not error, this is used for tracking if object is null |
| BUG-027 | Codegen             | Match statements with data variants cause LLVM IR generation failure.                                                    | Fixed   |
| BUG-028 | Analysis            | Generic Enum type inference fails for constructors (e.g., `Option.Some(42)`).                                            | Fixed   |
| BUG-029 | Parser              | Calling a function pointer field directly `obj.ptr()` fails.                                                             | Open    |
| BUG-030 | No Dynamic Dispatch | BPL does not support dynamic dispatch (virtual methods). Method calls are statically resolved based on the pointer type. | Open    |
| BUG-031 | Codegen             | Comparison operators `!=` on structs generate invalid LLVM IR (`icmp` requires integer operands).                        | Open    |

## Details

### BUG-001: Integer Literal Overflow

The compiler accepts integer literals that do not fit in the target type.

```bpl
frame main() {
  local x: i8 = 128; // Should fail # would be nice to handle this during type checking, by default all integer literals are treated as i32 and then casted to target type, maybe check if literal is in range of target type during cast?
  local y: i32 = 2147483648; // Should fail
}
```

### BUG-002: Division by Zero

Constant folding or type checking does not catch division by zero.

```bpl
frame main() {
  local x: i32 = 1 / 0; // Should fail # should fail, currently we dont do any sort of optimization or constant folding on our end and we leave it to llvm to handle it
}
```

### BUG-003: Recursive Structs

Structs can contain themselves directly, leading to infinite size.

```bpl
struct Node {
  next: Node, // Should fail, must be *Node
}
```

### BUG-004: Duplicate Parameters

Functions accept multiple parameters with the same name.

```bpl
frame test(a: i32, a: i32) {} // Should fail
```

### BUG-005: Zero-sized Arrays

Arrays with size 0 are accepted.

```bpl
frame main() {
  local arr: i32[0]; // Should fail?
}
```

### BUG-006: Negative Array Sizes

Negative array sizes cause a parser error `Expected ... but "-" found` instead of a clear semantic error.

```bpl
frame main() {
  local arr: i32[-1];
}
```

### BUG-007: Duplicate Switch Cases

Switch statements accept duplicate case values.

```bpl
frame main() {
  switch (1) {
    case 1: {}
    case 1: {} // Should fail
  }
}
```

### BUG-008: Variable Shadowing

Variables can be redeclared in the same scope.

```bpl
frame main() {
  local x: i32 = 1;
  local x: i32 = 2; // Should fail
}
```

### BUG-009: Unreachable Code

Code after a return statement is accepted and likely generated, which is wasteful and often a bug.

```bpl
frame main() {
  return;
  local x: i32 = 1; // Should warn or fail
}
```

### BUG-010: Unused Variables

Variables that are declared but never used are accepted without warning.

```bpl
frame main() {
  local x: i32 = 1; // Should warn
}
```

### BUG-011: Invalid Type Casts

The compiler accepts casts between incompatible types, such as `i32` to `string`.

```bpl
frame main() {
  local x: i32 = 1;
  local s: string = cast<string>(x); // Should fail
}
```

### BUG-012: Struct Literals Missing Fields

Struct literals can omit fields, leaving them uninitialized.

```bpl
struct Point { x: i32, y: i32, }
frame main() {
  local p: Point = Point { x: 1 }; // Missing y, should fail
}
```

### BUG-013: Switch on Float

Switch statements accept floating point values, which is usually not supported or requires epsilon comparison.

```bpl
frame main() {
  switch (1.5) {
    case 1.5: {}
  }
}
```

### BUG-014: Sizeof Void

`sizeof<void>` is accepted, but void has no size.

```bpl
frame main() {
  local s: i64 = sizeof<void>(); // Should fail
}
```

### BUG-015: Modulo on Float

The modulo operator `%` is accepted for floating point types.

```bpl
frame main() {
  local x: f64 = 5.5 % 2.2; // Should fail or require fmod
}
```

### BUG-016: Float Indexing

Arrays can be indexed with floating point values.

```bpl
frame main() {
  local arr: i32[10];
  local x: i32 = arr[1.5]; // Should fail
}
```

### BUG-017: String Negation

Unary negation `-` is accepted for strings.

```bpl
frame main() {
  local s: string = -"hello"; // Should fail
}
```

### BUG-018: String Subtraction

Subtraction operator `-` is accepted for strings.

```bpl
frame main() {
  local s: string = "a" - "b"; // Should fail
}
```

### BUG-019: Assignment to R-Value

The compiler accepts assignment to r-values like literals or expressions.

```bpl
frame main() {
  1 = 2; // Should fail
  (1 + 2) = 3; // Should fail
}
```

### BUG-020: Array Out of Bounds Access

The runtime does not perform bounds checking on array access. Accessing `arr[100]` of a size 3 array returns garbage values instead of terminating the program.

```bpl
frame main() {
  local arr: i32[3];
  local val: i32 = arr[100]; // Returns garbage, should crash or throw
}
```

### BUG-021: Silent Division by Zero

Division by zero at runtime causes the program to exit with code 1 (likely SIGFPE) but prints no error message to stderr.

```bpl
frame main() {
  local x: i32 = 1 / 0; // Silent crash
}
```

### BUG-022: Silent Stack Overflow

Infinite recursion causes the program to exit with code 1 (likely SIGSEGV) but prints no error message to stderr.

```bpl
frame recurse(n: i32) { recurse(n+1); }
frame main() { recurse(0); } // Silent crash
```

### BUG-023: Strict Struct Definition Syntax

The parser requires a trailing comma for the last field in a struct definition.

```bpl
struct Point { x: i32, y: i32 } // Syntax Error
struct Point { x: i32, y: i32, } // OK
```

### BUG-024: Generic Struct Literal Syntax

The parser does not support specifying type arguments in a struct literal.

```bpl
local b: Box<i32> = Box<i32> { value: 1 }; // Syntax Error
// Workaround: Use a helper function or rely on type inference if possible (not supported for literals yet)
```

### BUG-025: No Trailing Commas in Calls

Function calls do not support trailing commas, which makes multi-line arguments harder to maintain.

```bpl
foo(
  1,
  2, // Syntax Error
);
```

### BUG-026: Hidden Struct Overhead

Structs include a hidden `i1` field (null bit) which increases their size and affects alignment.

```bpl
struct Point { x: i32, y: i32, }
// sizeof<Point> is 12 (4 + 4 + 1 + padding), expected 8.
```

### BUG-027: Match Codegen Failure

Matching on enum variants with data causes an LLVM IR generation error (`expected instruction opcode`).

```bpl
match (msg) {
  Message.Move(x, y) => { ... }, // Causes codegen error
}
```

### BUG-028: Generic Enum Inference

The compiler fails to infer generic type arguments for enum constructors.

```bpl
local opt: Option<i32> = Option.Some(42); // Error: Type mismatch or undefined symbol
```

### BUG-029: Direct Function Pointer Call

Calling a function pointer stored in a struct field directly fails.

```bpl
struct S { cb: Func<void>(), }
local s: S;
s.cb(); // Fails
// Workaround:
local f = s.cb;
f(); // Works
```

### BUG-030: No Dynamic Dispatch

BPL does not support dynamic dispatch (virtual methods). Method calls are statically resolved based on the pointer type.

```bpl
frame make_speak(a: *Animal) { a.speak(); }
local d: Dog;
make_speak(&d); // Calls Animal.speak(), not Dog.speak()
```

### BUG-031: Struct Comparison Codegen Error

Comparison operators (like `!=`) on structs generate invalid LLVM IR because `icmp` requires integer operands, but the compiler tries to compare structs directly.

```bpl
struct Box { val: i32, frame __ne__(this: *Box, other: Box) ret bool { ... } }
if (b1 != b2) { ... } // Generates invalid LLVM IR
```
