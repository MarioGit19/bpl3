---
applyTo: '**/*.x, **/*.sh, **/*.bpl'
---

# BPL (Basic Programming Language) Coding Assistant Instructions

You are working with BPL, a custom programming language. Follow these instructions strictly when writing code, creating examples, or running tests.

## 1. Syntax & Language Rules

### Functions
- Declare functions using the `frame` keyword.
- Use `return` to exit.
- Invoke functions directly by name.

```bpl
frame my_function(a: int, b: int): u64 {
    local result: u64 = a + b;
    return result;
}

frame main() ret u8 {
    local x: u64 = my_function(10, 20);
    return 0l
}
```

### Variables
- Declare global variables with `global`.
- Declare local variables with `local`.

```bpl
local x: u64 = 42;
```

### Control Flow
- **Loops**: Use `loop` for infinite loops. Use `break` to exit.
- **Conditionals**: Use `if`, `else`.

```bpl
local i: u64 = 0;
loop {
    if (i > 10) {
        break;
    }
    i = i + 1;
}
```

### Imports & Externs
- Use `import` and `export` for modules.
- Use `extern` for C library functions.
- Use import [Type] from './module.x'; # for importing specific types from *.x files
- Use std/file.x for standard library imports that are inside lib directory.

```bpl
import printf from 'libc';
import [Array] from 'std/array.x';

frame print_hello() {
    printf("Hello %s\n", "World")
}
```

### Comments
- Use `#` for single-line comments.

## 2. Project Structure & Examples

- **Location**: All new examples MUST be placed in `example/<example_name>/`.
- **File Naming**: The main file should be descriptive, e.g., `example/fib/fib.x`.

## 3. Testing & Verification (MANDATORY)

**You must verify your code.**

### Creating Tests
- Every new example **MUST** have a corresponding test script.
- **Reference**: Use `example/test_example.sh` as the template for your test scripts.
- The test script should compile and run the BPL code and assert the output.

### Running Tests
- **Unit Tests**: Run `bun test` to ensure no regressions in the compiler itself.
- **Integration Tests**: Run `./tests.sh` to run all example tests.
- **Single Test**: To run a specific example test, use `./tests.sh <example_dir_name>`.
  - Example: `./tests.sh fib`
- **Run Source**: To run a `.x` file directly:
  - `bun index.ts example/path/to/file.x -r`

### Workflow
1. Write BPL code in `example/<name>/<name>.x`.
2. Create `example/<name>/test.sh` (chmod +x).
3. Run `./tests.sh <name>` to verify the new example.
4. Run `bun test` to ensure compiler stability.
