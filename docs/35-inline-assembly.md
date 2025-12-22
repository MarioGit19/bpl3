# Inline Assembly

BPL allows embedding LLVM IR directly into the generated code. This is useful for performance-critical sections or accessing platform-specific features.

## Syntax

The `asm` block allows you to write raw LLVM IR instructions.

```bpl
asm {
    "add i32 1, 2"
}
```

## Variable Interpolation

You can access BPL variables (locals and globals) using the `(variableName)` syntax. The compiler will replace this with the corresponding LLVM register or global name.

```bpl
frame main() ret int {
    local a: int = 10;
    local b: int = 20;
    local res: int = 0;

    asm {
        # Load values from stack pointers
        "%val_a = load i64, i64* (a)"
        "%val_b = load i64, i64* (b)"

        # Perform operation
        "%sum = add i64 %val_a, %val_b"

        # Store result back
        "store i64 %sum, i64* (res)"
    }

    return res;
}
```

- `(local_var)` resolves to the register holding the pointer to the local variable (e.g., `%local_var_ptr.0`).
- `(global_var)` resolves to the global variable name (e.g., `@global_var`).

## Writing x86 Assembly

Since BPL compiles to LLVM IR, you cannot write raw x86 assembly directly in the top-level `asm` block. Instead, you must use LLVM's inline assembly mechanism (`call asm`).

### Example: x86-64 Assembly (AT&T Syntax)

```bpl
frame main() ret int {
    local res: int = 0;

    asm {
        # Use 'call asm sideeffect' to execute inline assembly
        # Note: Immediates must be escaped as $$ (e.g., $$42)
        # $0 refers to the first output constraint
        "%val = call i64 asm sideeffect \"movq $$42, %rax; movq %rax, $0\", \"=r,~{rax},~{dirflag},~{fpsr},~{flags}\"()"

        # Store the result back to BPL variable
        "store i64 %val, i64* (res)"
    }

    return res;
}
```

### Key Points for x86 Assembly

1.  **Wrap in LLVM IR**: Use `call <type> asm sideeffect "code", "constraints"(args)`.
2.  **Syntax**: LLVM defaults to AT&T syntax (`op src, dest`).
3.  **Immediates**: Use `$$` prefix for immediate values (e.g., `$$42`) to avoid conflict with operand placeholders (`$0`).
4.  **Constraints**: Use standard LLVM inline asm constraints (e.g., `"=r"` for output register, `"r"` for input register, `~{rax}` for clobbered registers).
