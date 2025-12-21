# Cross-Compilation

BPL uses LLVM as its backend, making cross-compilation straightforward.

## Target Triples

You can specify the target architecture and OS using LLVM target triples.

```bash
# Example command
bpl main.bpl --target x86_64-pc-windows-msvc
```
