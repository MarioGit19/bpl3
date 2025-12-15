# Struct Methods

Structs can have methods associated with them.

## Instance Methods

Instance methods take `this` as the first parameter. The type of `this` must be the struct type or a pointer to it.

```bpl
struct Vector {
    x: int;
    y: int;

    frame length(this: Vector) ret float {
        return sqrt(this.x * this.x + this.y * this.y);
    }
}
```

## Static Methods

Static methods are defined inside the struct but do not take `this` as a parameter.

```bpl
struct Vector {
    x: int;
    y: int;

    frame zero() ret Vector {
        return Vector { x: 0, y: 0 };
    }
}
```

## Calling Methods

```bpl
local v: Vector = Vector.zero();
local len: float = v.length();
```
