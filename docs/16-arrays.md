# Arrays

BPL supports both fixed-size and dynamic arrays (via standard library).

## Fixed-Size Arrays

Fixed-size arrays are allocated on the stack or as part of a struct.

```bpl
local arr: int[5];
arr[0] = 10;
```

## Array Literals

```bpl
local arr: int[] = [1, 2, 3, 4, 5];
```

## Accessing Elements

Elements are accessed using square brackets `[]`. Indices are 0-based.

```bpl
local x: int = arr[2];
```
