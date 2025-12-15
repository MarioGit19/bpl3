# Function Pointers

BPL treats functions as first-class citizens. You can pass functions as arguments, return them, and store them in variables.

## Type Syntax

`Func<ReturnType>(ArgType1, ArgType2, ...)`

## Example

```bpl
frame add(a: int, b: int) ret int {
    return a + b;
}

frame apply(op: Func<int>(int, int), x: int, y: int) ret int {
    return op(x, y);
}

frame main() ret int {
    local f: Func<int>(int, int) = add;
    return apply(f, 10, 20);
}
```
