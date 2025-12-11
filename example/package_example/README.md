# Math Utils Package

A collection of mathematical utility functions for BPL.

## Installation

```bash
bpl install math-utils-1.0.0.tgz
```

Or from a local path:
```bash
bpl install ./math-utils-1.0.0.tgz
```

## Usage

```bpl
import add, multiply, square from "math-utils";

frame main() ret int {
  local result: int = add(5, 3);
  local squared: int = square(result);
  return squared;
}
```

## API

- `add(a: int, b: int) ret int` - Add two integers
- `subtract(a: int, b: int) ret int` - Subtract two integers
- `multiply(a: int, b: int) ret int` - Multiply two integers
- `divide(a: int, b: int) ret int` - Divide two integers
- `square(x: int) ret int` - Square a number
- `cube(x: int) ret int` - Cube a number

## License

MIT
