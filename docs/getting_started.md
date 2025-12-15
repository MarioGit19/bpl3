# Getting Started with BPL

This guide will help you set up the BPL compiler and write your first program.

## Prerequisites

To use BPL, you need the following tools installed on your system:

- **Bun**: A fast all-in-one JavaScript runtime. [Install Bun](https://bun.sh/)
- **Clang**: The LLVM compiler front end, used to compile and link the generated code.
- **GCC**: The GNU Compiler Collection (optional, Clang is preferred).

On Ubuntu/Debian, you can install Clang with:

```bash
sudo apt update
sudo apt install clang
```

## Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/pr0h0/bpl3.git
    cd bpl3/transpiler
    ```

2.  **Install dependencies:**
    ```bash
    bun install
    ```

## Your First Program

Create a new file named `hello.x` with the following content:

```bpl
frame main() ret u8 {
    call print("Hello, BPL!\n");
    return 0;
}
```

### Explanation

- `frame main() ret u8`: Defines the entry point function `main` which returns a `u8` (unsigned 8-bit integer).
- `call print(...)`: Calls the built-in `print` function.
- `return 0`: Returns the exit code 0 (success).

## Compiling and Running

To compile and run your program, use the `index.ts` script:

```bash
bun index.ts hello.x
```

or

```bash
./cmp.sh hello.x
```

This command will:

1.  Transpile `hello.x` to `hello.ll` (LLVM IR).
2.  Compile `hello.ll` to `hello.o`.
3.  Link `hello.o` to create the executable `hello`.

To run the executable:

```bash
./hello
```

You should see:

```
Hello, BPL!
```

### One-step Run

You can use the `-r` (run) flag to compile and run in one step:

```bash
bun index.ts -r hello.x
```

## Next Steps

Try working with structs:

```bpl
struct Point {
    x: i32,
    y: i32,
}

frame main() ret u8 {
    # Initialize with struct literal
    local p: Point = {x: 10, y: 20};
    call print("Point: (%d, %d)\n", p.x, p.y);
    return 0;
}
```

Save this as `point.x` and compile:

```bash
bun index.ts -r point.x
```

## Compiler Options

Run `bun index.ts --help` to see all available options:

- `-q | --quiet`: Suppress output.
- `-p | --print-asm`: Print generated LLVM IR.
- `-r | --run`: Run after compilation.
- `-g | --gdb`: Run inside GDB.
- `-l | --lib`: Compile as a shared library.
- `-s | --static`: Compile as a static executable.

## VS Code Extension

For syntax highlighting in VS Code:

1.  Go to `vs-code-ext/highlight`.
2.  Run `bun install` and `bun run build-vsix`.
3.  Install the generated `.vsix` file in VS Code.
