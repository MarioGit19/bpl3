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

````bpl
try {
    # ...
} catch {
    printf("Caught something\n");
}

## Null Access Exceptions

The runtime automatically throws `NullAccessError` when code touches a null object (member access, pointer deref to a struct, or array element that is null-tracked). This error carries three string fields:

- `message`: human-friendly description (e.g., "Attempted to access member of null object")
- `function`: the function where the access happened
- `expression`: the expression that triggered the fault (e.g., `arr[1].data`)

You can catch it explicitly to recover:

```bpl
try {
    local p: Point = null;
    local v: int = p.x; # throws NullAccessError
} catch (e: NullAccessError) {
    printf("Null access: %s in %s (expr: %s)\n", e.message, e.function, e.expression);
}
````
