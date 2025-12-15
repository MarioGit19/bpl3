# Type Aliases

Type aliases create a new name for an existing type. They are useful for simplifying complex types or adding semantic meaning.

## Syntax

```bpl
type UserID = int;
type Point = (int, int);
type Handler = Func<void>(int);
```

## Usage

```bpl
local id: UserID = 123;
local p: Point = (0, 0);
```
