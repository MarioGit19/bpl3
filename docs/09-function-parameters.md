# Function Parameters

Functions in BPL can take parameters and return values.

## Parameters

Parameters are declared with their type.

```bpl
frame add(a: int, b: int) ret int {
    return a + b;
}
```

## Const Parameters

Parameters can be marked as `const` to prevent modification within the function.

```bpl
frame print(msg: const string) {
    # msg = "new string"; # Error: Cannot assign to const parameter
    printf("%s\n", msg);
}
```

## Return Values

Functions specify their return type after the parameter list using `ret Type`. If a function does not return a value, use `ret void` or omit the return type (defaults to void).

```bpl
frame log(msg: string) ret void {
    printf("%s\n", msg);
}
```

## Variadic Functions

BPL supports variadic functions, primarily for C interoperability (FFI).

```bpl
extern frame printf(fmt: string, ...);
```
