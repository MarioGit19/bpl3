# Module Dependency Graph

## Visual Representation

```
                    main.bpl
                    /   |   \
                   /    |    \
                  /     |     \
                 /      |      \
                /       |       \
               v        v        v
         geometry   graphics   physics
              |         |       /    \
              |         |      /      \
              v         v     v        v
          math_utils    geometry    math_utils
                           |
                           v
                       math_utils
```

## Compilation Order

After topological sort:

```
1. math_utils.bpl    ← No dependencies (compiled first)
2. geometry.bpl      ← Depends on: math_utils
3. graphics.bpl      ← Depends on: geometry
4. physics.bpl       ← Depends on: geometry, math_utils
5. main.bpl          ← Depends on: geometry, graphics, physics (compiled last)
```

## Import Statements

### math_utils.bpl
```bpl
// No imports
```

### geometry.bpl
```bpl
import [square] from "./math_utils.bpl";
```

### graphics.bpl  
```bpl
import [Point, Circle] from "./geometry.bpl";
```

### physics.bpl
```bpl
import [Point, distanceSquared] from "./geometry.bpl";
import [add, multiply] from "./math_utils.bpl";
```

### main.bpl
```bpl
import [Point, Circle, circleArea] from "./geometry.bpl";
import [drawCircle] from "./graphics.bpl";
import [Body, Velocity, kineticEnergy] from "./physics.bpl";
```

## Why This Order Matters

The topological order ensures that when compiling any module:

1. **All imported symbols are already defined** in the symbol table
2. **Type information is available** for cross-module type checking
3. **No forward references** - everything referenced has been seen
4. **Optimization opportunities** - can inline across module boundaries

## Diamond Dependency

Note that `math_utils.bpl` appears multiple times in the dependency tree (imported by both `geometry` and `physics`), but it's only compiled **once** at the beginning. This is the "diamond dependency" pattern:

```
        geometry
        /      \
       /        \
      v          v
math_utils    physics
               /
              v
          math_utils (same module!)
```

The module cache ensures `math_utils` is parsed and compiled only once, even though it's needed by multiple modules.
