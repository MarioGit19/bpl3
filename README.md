# BPL3 Compiler

A transpiler for the BPL (Best Programming Language) v3 targeting LLVM IR.

## Features

- **Strong Static Typing**: Full type checking with type inference
- **Structs with Inheritance**: Object-oriented programming with single inheritance
- **Generics**: Generic functions and structs with monomorphization
- **Module System**: Import/export with dependency resolution
- **Error Handling**: Try/catch blocks with type matching
- **Advanced Type System**: Type aliases, tuples, function pointers
- **Memory Management**: Pointers, constructors, destructors
- **Code Formatter**: Built-in source code formatter
- **Package Manager**: Create, install, and manage BPL packages
- **Cross-Platform Compilation**: Compile for different architectures and systems

## Installation

### Prerequisites

- [Bun](https://bun.sh) runtime (for development)
- [Clang](https://clang.llvm.org/) (for compiling LLVM IR to executables)
- Node.js/npm (if not using Bun)

### Build from Source

```bash
git clone https://github.com/pr0h0/bpl3.git
cd bpl3
bun install
bun run build
```

This creates the `bpl` executable in the project root.

### Global Installation

```bash
npm install -g the-best-programming-language-v3
# or
bun install -g the-best-programming-language-v3
```

## Usage

### Basic Compilation

```bash
# Compile and generate LLVM IR
bpl main.bpl

# Compile and run immediately
bpl main.bpl --run

# Specify output file
bpl main.bpl -o my_program

# Enable verbose output
bpl main.bpl -v --run
```

### Cross-Platform Compilation

The compiler automatically detects your host platform and sets the appropriate target triple. You can override this for cross-compilation:

```bash
# Cross-compile for ARM64 Linux
bpl main.bpl --target aarch64-unknown-linux-gnu --march=armv8-a

# Cross-compile for Windows x64
bpl main.bpl --target x86_64-pc-windows-gnu

# Cross-compile for macOS ARM64
bpl main.bpl --target arm64-apple-darwin

# Specify sysroot for cross-compilation
bpl main.bpl --target aarch64-unknown-linux-gnu --sysroot /opt/sysroots/aarch64

# Pass additional flags to clang
bpl main.bpl --clang-flag -O2 --clang-flag -static
```

**Supported host defaults:**

- Linux x64: `x86_64-pc-linux-gnu`
- Linux ARM64: `aarch64-unknown-linux-gnu`
- macOS ARM64: `arm64-apple-darwin`
- macOS x64: `x86_64-apple-darwin`
- Windows x64: `x86_64-pc-windows-gnu`

### Emit Options

```bash
# Emit LLVM IR (default)
bpl main.bpl --emit llvm

# Emit AST as JSON
bpl main.bpl --emit ast

# Emit tokens
bpl main.bpl --emit tokens

# Emit formatted source code
bpl main.bpl --emit formatted
```

### Code Formatting

```bash
# Format files and print to stdout
bpl format main.bpl

# Format and write back to file
bpl format -w main.bpl

# Format multiple files
bpl format -w examples/**/*.bpl
```

### Package Management

```bash
# Initialize a new BPL project
bpl init my-project

# Create a distributable package
bpl pack

# Install a package
bpl install package-name-1.0.0.tgz

# Install dependencies from bpl.json
bpl install

# List installed packages
bpl list

# Uninstall a package
bpl uninstall package-name
```

### Incremental Compilation

```bash
# Enable module caching for faster recompilation
bpl main.bpl --cache --run
```

## Language Quick Reference

### Hello World

```bpl
extern printf(fmt: string, ...);

fn main(): int {
    printf("Hello, World!\n");
    return 0;
}
```

### Structs and Inheritance

```bpl
struct Animal {
    name: string;
    age: int;

    fn speak() {
        printf("Animal sound\n");
    }
}

struct Dog : Animal {
    breed: string;

    fn speak() {
        printf("Woof!\n");
    }
}
```

### Generics

```bpl
struct Box<T> {
    value: T;
}

fn identity<T>(val: T): T {
    return val;
}

fn main(): int {
    local box: Box<int>;
    box.value = 42;

    local result: int = identity<int>(100);
    return 0;
}
```

### Error Handling

```bpl
fn divide(a: int, b: int): int {
    if (b == 0) {
        throw 1;
    }
    return a / b;
}

fn main(): int {
    try {
        local result: int = divide(10, 0);
    } catch (error: int) {
        printf("Error: division by zero\n");
    }
    return 0;
}
```

### Module System

```bpl
# math.bpl
export fn add(a: int, b: int): int {
    return a + b;
}

# main.bpl
import { add } from "./math.bpl";

fn main(): int {
    local sum: int = add(5, 3);
    return 0;
}
```

## CLI Options Reference

### Compilation Options

- `<files...>` - Source file(s) to compile
- `-o, --output <file>` - Output file path
- `--emit <type>` - Emit type: `llvm`, `ast`, `tokens`, `formatted` (default: `llvm`)
- `--run` - Run the generated code after compilation
- `-v, --verbose` - Enable verbose output
- `--cache` - Enable incremental compilation with module caching
- `--write` - Write formatted output back to file (for `--emit formatted`)

### Cross-Compilation Options

- `--target <triple>` - Target triple for clang (e.g., `x86_64-pc-windows-gnu`)
- `--sysroot <path>` - Sysroot path for cross-compilation
- `--cpu <cpu>` - Target CPU for clang (e.g., `znver4`)
- `--march <arch>` - Target architecture for clang (e.g., `arm64`)
- `--clang-flag <flag...>` - Additional flags forwarded directly to clang (repeatable)

## Project Structure

```
transpiler/
├── compiler/
│   ├── backend/         # Code generation (LLVM IR)
│   ├── common/          # AST, errors, utilities
│   ├── formatter/       # Code formatter
│   ├── frontend/        # Lexer and parser
│   └── middleend/       # Type checker, module resolver, package manager
├── examples/            # Example BPL programs
├── grammar/             # PEG grammar definitions
├── lib/                 # Standard library (.x files)
├── tests/               # Test suite
├── vscode-ext/          # VS Code extension
└── index.ts             # CLI entry point
```

## Development

### Running Tests

```bash
bun test
```

### Type Checking

```bash
bun run check
```

### Building

```bash
bun run build
```

### Running Examples

```bash
bun index.ts examples/fibonacci/main.bpl --run
```

## Documentation

- [Language Specification](LANGUAGE_SPEC.md) - Complete language syntax and semantics
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md) - Technical implementation details
- [Package Manager](PACKAGE_MANAGER.md) - Package management guide
- [TODO](TODO.md) - Roadmap and planned features

## Examples

The `examples/` directory contains numerous working examples:

- `hello-world/` - Basic hello world
- `fibonacci/` - Fibonacci sequence
- `loops/` - Loop constructs
- `generics/` - Generic programming
- `error_handling/` - Try/catch examples
- `structs/` - Struct definitions
- `objects_inheritance/` - Inheritance examples
- `pointers/` - Pointer operations
- And many more...

## License

Apache-2.0

## Author

pr0h0

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## Links

- [GitHub Repository](https://github.com/pr0h0/bpl3)
- [npm Package](https://www.npmjs.com/package/the-best-programming-language-v3)
