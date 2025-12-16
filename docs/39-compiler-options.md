# Compiler Options

The BPL compiler (`bpl`) supports various flags.

## Common Flags

- `-o <file>`: Output file name.
- `--target <triple>`: Target platform.
- `--emit <type>`: Emit `llvm` (default), `ast`, `tokens`, or `formatted`.
- `--run`: Compile and run the produced executable.
- `-v, --verbose`: Verbose compiler output.
- `-e, --eval <code>`: Compile code passed directly on the command line.
- `--stdin`: Compile code read from standard input.

```bash
# Examples
bpl hello.bpl --emit ast
bpl hello.bpl --run
bpl -e 'frame main() ret int { return 0; }' --run
cat hello.bpl | bpl --stdin --emit tokens
```
