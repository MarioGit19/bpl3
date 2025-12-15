# Memory Safety and Undefined Behavior Detection

This document describes the comprehensive memory safety and undefined behavior detection system implemented in the BPL compiler.

## Overview

The BPL compiler now includes two strict analysis passes that run before code generation:

1. **Enhanced Semantic Analyzer** - Detects undefined behavior in language semantics
2. **Memory Safety Analyzer** - Detects memory-related vulnerabilities

Both analyzers are **strict by default** and will halt compilation when critical errors are detected.

## Memory Safety Features

### Null Pointer Checks

The compiler performs static analysis to detect potential null pointer dereferences.

```bpl
local p: *u64 = null;
local x: u64 = *p; # Warning: Potential null pointer dereference
```

### Use-After-Free Detection

The compiler tracks `malloc` and `free` calls to detect use-after-free errors.

```bpl
local p: *u64 = call malloc(8);
call free(p);
*p = 10; # Error: Use after free
```

### Buffer Overflow Detection

Static analysis attempts to detect out-of-bounds array access when indices are constant or can be inferred.

```bpl
local arr: u64[10];
arr[10] = 5; # Error: Array index out of bounds
```

## Undefined Behavior Detection

### Shift Operations

The compiler now enforces strict rules for bitwise shift operations:

```x
# ERROR: Shift by negative amount
local x: u64 = 10 << -1;  # Compile error

# ERROR: Shift amount >= type width
local y: u8 = 10 << 8;    # Compile error (u8 is 8 bits)

# WARNING: Runtime shift amount needs checking
frame test(n: u64) {
    local z: u64 = 10 << n;  # Warning: check 0 <= n < 64
}

# ERROR: Cannot shift floating-point types
local f: f64 = 10.5 << 2;  # Compile error

# WARNING: Left shift on signed integers
local s: i32 = 10 << 5;    # Warning: may overflow
```

### Division Operations

```x
# ERROR: Division by zero
local x: u64 = 10 / 0;     # Compile error

# ERROR: Modulo by zero
local y: u64 = 10 % 0;     # Compile error

# WARNING: Runtime division needs checking
frame test(divisor: u64) {
    local z: u64 = 10 / divisor;  # Warning: check divisor != 0
}
```

### Pointer Arithmetic

```x
# ERROR: Cannot add two pointers
frame test(p: *u64, q: *u64) {
    local r: *u64 = p + q;   # Compile error
}

# ERROR: Cannot multiply pointers
local s: *u64 = p * q;       # Compile error

# OK: Pointer-pointer subtraction
local diff: u64 = p - q;     # Allowed

# WARNING: Subtracting different pointer types
frame test2(p: *u64, q: *u32) {
    local diff: u64 = p - q;  # Warning: different types
}
```

### Uninitialized Variables

```x
# WARNING: Uninitialized local variable
frame test() {
    local x: u64;            # Warning: declared without initialization
}

# WARNING: Using uninitialized variable
frame test2() {
    local x: u64;
    local y: u64 = x + 1;    # Warning: x may be uninitialized
}

# OK: Variable is initialized
frame test3() {
    local x: u64 = 10;
    local y: u64 = x + 1;    # No warning
}

# OK: Initialization through assignment
frame test4() {
    local x: u64;
    x = 10;                  # Tracked as initialized
    local y: u64 = x + 1;    # No warning
}
```

## Memory Safety Checks

### Null Pointer Dereferencing

```x
# WARNING: Uninitialized pointer
frame test() {
    local p: *u64;           # Warning: uninitialized pointer
}

# WARNING: Null pointer should be checked
frame test2() {
    local p: *u64 = null;
    local x: u64 = *p;       # Warning: potential null dereference
}

# OK: Null-checked before dereference
frame test3() {
    local p: *u64 = null;
    if (p != null) {
        local x: u64 = *p;   # No warning - null checked
    }
}
```

### Use-After-Free

```x
import free from "libc";

# ERROR: Use-after-free
frame test() {
    local p: *u64 = null;
    call free(p);
    local x: u64 = *p;       # Error: using freed pointer
}

# ERROR: Double free
frame test2() {
    local p: *u64 = null;
    call free(p);
    call free(p);            # Error: double free detected
}
```

### Buffer Overflow

```x
# ERROR: Constant out-of-bounds access
frame test() {
    local arr: u64[10];
    local x: u64 = arr[10];  # Error: index 10 >= size 10
}

# WARNING: Runtime bounds check needed
frame test2(i: u64) {
    local arr: u64[10];
    local x: u64 = arr[i];   # Warning: unchecked array index
}

# WARNING: Pointer indexing
frame test3(p: *u64, i: u64) {
    local x: u64 = p[i];     # Warning: may access out-of-bounds
}
```

### Integer Overflow

```x
# ERROR: Integer literal out of range
frame test() {
    local x: u8 = 300;       # Error: 300 > 255 (max for u8)
}

# WARNING: Signed integer overflow
frame test2(a: i32, b: i32) {
    local c: i32 = a + b;    # Warning: may overflow
}
```

### Unsafe Standard Library Functions

```x
import strcpy from "libc";
import sprintf from "libc";

# WARNING: Unsafe function
frame test(dest: *u8, src: *u8) {
    call strcpy(dest, src);  # Warning: no bounds checking
                              # Suggest: use strncpy
}

# WARNING: Unsafe function
frame test2(buf: *u8) {
    call sprintf(buf, "test"); # Warning: no bounds checking
                                # Suggest: use snprintf
}
```

### Memory Leaks

```x
import malloc, free from "libc";

# WARNING: Memory leak
frame test() {
    local p: *u64 = call malloc(8);
    # Function returns without freeing p
}  # Warning: potential memory leak

# OK: Memory freed
frame test2() {
    local p: *u64 = call malloc(8);
    call free(p);            # No warning
}
```

### Pointer Arithmetic Safety

```x
# WARNING: Pointer arithmetic validation
frame test(p: *u64) {
    local q: *u64 = p + 5;   # Warning: validate offset
}

# WARNING: Validate offset doesn't exceed bounds
frame test2(arr: *u64, offset: u64) {
    local elem: *u64 = arr + offset;  # Warning: check bounds
}
```

## Integration

The safety analyzers are automatically run during compilation:

```typescript
// In utils/transpiler.ts
const analyzer = new SemanticAnalyzer();
analyzer.analyze(program, scope);

const memorySafety = new MemorySafetyAnalyzer();
memorySafety.analyze(program, scope);

// Compilation halts if memory safety errors are found
if (memorySafety.errors.length > 0) {
  throw new Error(`Compilation failed due to memory safety errors`);
}
```

## Error Levels

### Errors (Compilation Halts)

- Division/modulo by constant zero
- Shift by negative or too large constant
- Out-of-bounds array access with constant index
- Use-after-free
- Double free
- Integer literals out of type range
- Invalid pointer arithmetic (adding/multiplying pointers)

### Warnings (Compilation Continues)

- Uninitialized variables
- Potential null pointer dereference
- Unchecked runtime array indices
- Unchecked runtime division
- Signed integer overflow potential
- Using unsafe standard library functions
- Memory leaks
- Pointer arithmetic without bounds validation

## Suppressing Warnings

Some warnings can be suppressed by following best practices:

### For Unused Variables

```x
# Prefix with underscore
frame test(x: u64, _unused: u64) {
    return x;
}
```

### For Null Pointers

```x
# Always check before dereferencing
if (ptr != null) {
    local value: u64 = *ptr;
}
```

### For Array Indexing

```x
# Add explicit bounds check
if (index >= 0 && index < array_size) {
    local value: u64 = arr[index];
}
```

## Benefits

1. **Catch bugs at compile time** - Many runtime errors are caught before execution
2. **Prevent security vulnerabilities** - Buffer overflows and use-after-free are detected
3. **Safer code** - Encourages defensive programming practices
4. **Better documentation** - Warnings indicate areas that need attention
5. **Improved reliability** - Reduces undefined behavior in production

## Future Enhancements

Planned improvements to the safety system:

- [ ] Flow-sensitive analysis for more precise tracking
- [ ] Inter-procedural analysis across function boundaries
- [ ] Taint analysis for untrusted input
- [ ] Lifetime analysis for borrowed references
- [ ] Data flow analysis for initialization tracking
- [ ] Symbolic execution for complex conditions
- [ ] Integration with formal verification tools

## Testing

Comprehensive test suites verify the safety checks:

- `tests/memorySafety.test.ts` - Memory safety checks
- `tests/undefinedBehavior.test.ts` - Undefined behavior detection

Run tests:

```bash
bun test tests/memorySafety.test.ts
bun test tests/undefinedBehavior.test.ts
```

## References

- [C Undefined Behavior](https://en.cppreference.com/w/c/language/behavior)
- [CWE Top 25 Most Dangerous Software Weaknesses](https://cwe.mitre.org/top25/)
- [CERT C Coding Standard](https://wiki.sei.cmu.edu/confluence/display/c/SEI+CERT+C+Coding+Standard)
- [Rust's Borrow Checker](https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html)
