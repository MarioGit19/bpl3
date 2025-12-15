# Debugging

Debugging BPL programs.

## LLDB / GDB

Since BPL compiles to native code (via LLVM), you can use standard debuggers.

```bash
bpl build -g src/main.bpl -o app
lldb ./app
```
