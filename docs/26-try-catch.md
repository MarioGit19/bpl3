# Try-Catch

BPL supports structured exception handling.

## Syntax

```bpl
try {
    # Code that might throw
    throw 1;
} catch (e: int) {
    # Handle integer exception
    printf("Caught error: %d\n", e);
} catch (e: string) {
    # Handle string exception
    printf("Caught error: %s\n", e);
}
```

## Catch-All

You can use a catch block without a type to catch any exception (implementation dependent).

```bpl
try {
    # ...
} catch {
    printf("Caught something\n");
}
```
