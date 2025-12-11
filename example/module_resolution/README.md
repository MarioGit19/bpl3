# Module Resolution System Demo

This example demonstrates the BPL3 compiler's two-phase module resolution system.

## Architecture Overview

The module resolution system implements:

1. **Dependency Graph Construction** - Recursively discovers all imported modules
2. **Topological Sorting** - Determines correct compilation order
3. **Circular Dependency Detection** - Catches import cycles early
4. **Module Caching** - Prevents redundant parsing

## Example Structure

This example contains 5 interconnected modules:

```
main.bpl          (Entry point - uses all modules)
├── geometry.bpl  (Geometric shapes & calculations)
│   └── math_utils.bpl
├── graphics.bpl  (Rendering utilities)
│   └── geometry.bpl
│       └── math_utils.bpl
└── physics.bpl   (Physics calculations)
    ├── geometry.bpl
    │   └── math_utils.bpl
    └── math_utils.bpl
```

### Module Descriptions

- **`math_utils.bpl`** - Basic math functions (no dependencies)
- **`geometry.bpl`** - Point/Circle structs and distance calculations
- **`graphics.bpl`** - Printing and drawing utilities
- **`physics.bpl`** - Velocity, Body structs and kinetic energy
- **`main.bpl`** - Application entry point that uses all modules

## Running the Demo

### View Module Resolution Process

```bash
bun example/module_resolution/demo.ts
```

This will show:
- Module discovery phase
- Dependency graph
- Topological compilation order
- Module statistics

### Example Output

```
╔════════════════════════════════════════════════════════════╗
║        BPL3 Module Resolution System Demo                ║
╚════════════════════════════════════════════════════════════╝

📦 Phase 1: Module Discovery
────────────────────────────────────────────────────────────
✓ Found 5 modules

🔗 Phase 2: Dependency Graph
────────────────────────────────────────────────────────────
[Shows dependency tree]

⚙️  Phase 3: Compilation Order (Topological Sort)
────────────────────────────────────────────────────────────
Modules must be compiled in this order:

   1. math_utils.bpl
   2. geometry.bpl
   3. graphics.bpl
   4. physics.bpl
   5. main.bpl
```

## How It Works

### 1. Module Discovery

The `ModuleResolver` starts from `main.bpl` and:
- Parses the file to extract import statements
- For each import, resolves the module path
- Recursively loads each dependency
- Caches modules to avoid duplicate parsing

### 2. Dependency Graph

The resolver builds a graph where:
- Nodes are modules (by absolute path)
- Edges represent "imports from" relationships
- The graph is stored as an adjacency list

### 3. Topological Sort

Using depth-first search, the resolver:
- Visits modules in dependency-first order
- Detects cycles during traversal
- Returns modules ordered for compilation

### 4. Compilation

With the sorted modules:
- Each module is type-checked in order
- All imported symbols are already defined
- Cross-module type references work correctly

## Key Features

### Circular Dependency Detection

If you create a cycle (A imports B, B imports A):

```bash
Error: Circular dependency detected involving: moduleA.bpl
```

### Module Caching

Each module is parsed only once:
- First encounter: Parse and cache
- Subsequent imports: Use cached AST
- Enables diamond dependencies without issues

### Standard Library Resolution

The system can resolve stdlib imports:

```bpl
import [printf] from "io";   // Resolves to lib/io.x
```

### Path Resolution

Supports multiple import styles:
- Relative: `"./module.bpl"`
- Absolute: `"/path/to/module.bpl"`
- Standard library: `"std"`, `"io"`, `"math"`

## Implementation Details

See `compiler/middleend/ModuleResolver.ts` for the full implementation.

Key methods:
- `resolveModulePath()` - Finds module files
- `loadModule()` - Parses and caches modules
- `topologicalSort()` - Computes compilation order
- `resolveModules()` - Main entry point

## Testing

Module resolver tests are in `tests/ModuleResolver.test.ts`:

```bash
bun test tests/ModuleResolver.test.ts
```

Tests cover:
- Single module (no dependencies)
- Linear dependencies (A → B → C)
- Diamond dependencies (A → B,C → D)
- Circular dependency detection
- Missing module errors

## Future Enhancements

- [ ] Per-module compilation and caching
- [ ] Incremental recompilation
- [ ] Module versioning and compatibility
- [ ] Package resolution from package.json
- [ ] Remote module loading (HTTP/HTTPS)
- [ ] Module bundling for deployment

## Related Files

- `compiler/middleend/ModuleResolver.ts` - Core implementation
- `compiler/index.ts` - Integration with Compiler class
- `tests/ModuleResolver.test.ts` - Test suite
- `TODO.md` - Feature roadmap
