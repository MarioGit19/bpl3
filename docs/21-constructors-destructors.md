# Constructors and Destructors

While BPL is not a fully object-oriented language like C++, it supports patterns for object lifecycle management.

## Constructors

Constructors are typically static methods that return a new instance of a struct.

```bpl
struct String {
    data: *char;
    len: int;

    frame new(s: *char) ret String {
        # ... allocation logic ...
    }
}
```

## Destructors

Destructors are methods that clean up resources. BPL does not automatically call destructors; you must call them manually or use a defer mechanism if available.

```bpl
struct String {
    # ...
    frame free(this: String) ret void {
        free(this.data);
    }
}
```
