# Design Patterns

Common patterns in BPL.

## Factory Pattern

Use static methods to create instances.

```bpl
struct User {
    frame create(name: string) ret User { ... }
}
```

## RAII (Resource Acquisition Is Initialization)

Use structs to manage resources, though manual cleanup is required (no automatic destructors yet).
