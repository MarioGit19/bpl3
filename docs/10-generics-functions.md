# Generic Functions

BPL supports generic functions, allowing you to write code that works with multiple types.

## Syntax

Generic parameters are specified in angle brackets `<T>` after the function name.

```bpl
frame swap<T>(a: *T, b: *T) ret void {
    local temp: T = *a;
    *a = *b;
    *b = temp;
}
```

## Usage

When calling a generic function, the compiler can often infer the type arguments.

```bpl
local x: int = 1;
local y: int = 2;
swap(&x, &y); // T inferred as int
```

You can also specify them explicitly:

```bpl
swap<int>(&x, &y);
```
