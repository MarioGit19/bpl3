# Foreign Function Interface (FFI)

BPL can call functions written in C and other languages that support the C ABI.

## Declaring External Functions

Use the `extern` keyword.

```bpl
extern frame printf(fmt: string, ...) ret int;
extern frame malloc(size: int) ret *void;
```

## Linking

When compiling, you must link against the libraries containing the external functions.
