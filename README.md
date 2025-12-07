# BPL (Best Programming Language) v3

BPL is a high-performance, statically typed programming language designed for simplicity and efficiency. It compiles directly to x86-64 assembly via LLVM, offering a balance between low-level control and high-level abstractions.

## 🚀 Features

*   **High Performance**: Compiles to optimized native machine code using LLVM.
*   **Modern Syntax**: Clean, readable syntax inspired by C, Go, and Python.
*   **Memory Management**: Supports pointers, manual memory management, and raw memory access.
*   **Type System**: Statically typed with support for integers, floats, strings, arrays, and user-defined structs.
*   **Object-Oriented**: Supports structs with methods, static methods, and factory patterns.
*   **Generics**: Powerful generic structs and functions for code reusability.
*   **Interoperability**: Easy FFI with C libraries and inline assembly support.
*   **Modularity**: Built-in module system with `import` and `export`.
*   **Tooling**: Includes a language server, VS Code extension, and dependency visualizer.

## 📦 Installation

### Prerequisites

Ensure you have the following installed on your system:
*   [Bun](https://bun.sh/) (JavaScript runtime)
*   `clang` and `gcc` (for linking)

### Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/pr0h0/bpl3.git
    cd bpl3
    ```

2.  **Install dependencies:**
    ```bash
    bun install
    ```

3.  **Verify installation:**
    ```bash
    bun index.ts --help
    ```

## 💻 Usage

To compile and run a BPL program (`.x` file), use the compiler entry point:

```bash
bun index.ts [options] <source_file>
```

### Common Options

| Option | Description |
| :--- | :--- |
| `-r`, `--run` | Run the executable. |
| `-q`, `--quiet` | Suppress output. |
| `-p`, `--print-asm` | Print assembly. |
| `--print-ast` | Print AST. |
| `-s`, `--static` | Static linking. |
| `-d`, `--dynamic` | Dynamic linking. |
| `-g`, `--gdb` | Run with GDB. |
| `-l`, `--lib` | Compile as library (don't link). |
| `--no-cleanup` | Don't cleanup temporary files. |
| `-O<level>`, `--optimization <level>` | Optimization level. |
| `--deps`, `--graph` | Show dependency graph. |
| `-e`, `--eval <code>` | Evaluate code. |

### Quick Start

Create a file named `hello.x`:

```bpl
import print_str from "std/io.x";

frame main() {
    call print_str("Hello, World!\n");
}

```

Compile and run it:

```bash
bun index.ts -r hello.x
```

## 🛠️ VS Code Extension

BPL comes with a dedicated VS Code extension for syntax highlighting, code completion, and more.

**Installation Steps:**

1.  Navigate to the extension directory:
    ```bash
    cd vs-code-ext
    ```
2.  Build the extension:
    ```bash
    ./build_extension.sh
    ```
3.  Install the generated `.vsix` file:
    ```bash
    code --install-extension client/bpl-vscode-0.1.0.vsix
    ```

## 📖 Language Overview

### Variables
```bpl
global count: u64 = 0;

frame main() {
    local x: i32 = 42;
    local pi: f64 = 3.14159;
    local message: *u8 = "BPL is cool";
}
```

### Structs & Generics
```bpl
struct Pair<T> {
    first: T,
    second: T
}

frame main() {
    local p: Pair<i32> = {10, 20};
    call print("First: %d\n", p.first);
}
```

### Control Flow
```bpl
if x > 10 {
    call print("Big\n");
} else {
    call print("Small\n");
}

local i: u64 = 0;
loop {
    if i >= 5 { break; }
    i = i + 1;
}
```

### Inline Assembly
```bpl
local val: u64 = 10;
asm {
    mov (val), %rax
    inc %rax
    mov %rax, (val)
}
```

## 🤝 Contributing

Contributions are welcome! Whether it's fixing bugs, adding features, or improving documentation.

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes (`git commit -m 'Add some amazing feature'`).
4.  Push to the branch (`git push origin feature/amazing-feature`).
5.  Open a Pull Request.

## 📄 License

This project is licensed under the **Apache 2.0 License**. See the [LICENSE](LICENSE) file for details.
