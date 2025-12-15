# Tuples

Tuples allow you to group multiple values of different types.

## Declaration

```bpl
local point: (int, int) = (10, 20);
local person: (string, int) = ("Alice", 30);
```

## Destructuring

You can unpack tuples into variables.

```bpl
local (x, y) = point;
local (name, age) = person;
```

## Accessing Elements

You can also access elements by index (if supported by the compiler version, otherwise use destructuring).

```bpl
# local x = point.0; # Syntax may vary
```
