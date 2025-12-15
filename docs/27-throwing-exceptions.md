# Throwing Exceptions

You can throw exceptions of any type.

## Syntax

Use the `throw` keyword followed by an expression.

```bpl
frame divide(a: int, b: int) ret int {
    if (b == 0) {
        throw "Division by zero";
    }
    return a / b;
}
```

## Propagation

Exceptions propagate up the call stack until they are caught by a `try-catch` block. If an exception is not caught, the program terminates.
