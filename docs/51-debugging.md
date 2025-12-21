# Debugging

Debugging BPL programs.

## LLDB / GDB

Since BPL compiles to native code (via LLVM), you can use standard debuggers.

```bash
bpl src/main.bpl -o app --clang-flag -g
lldb ./app
```
