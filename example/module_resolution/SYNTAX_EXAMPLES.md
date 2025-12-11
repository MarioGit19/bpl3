# Import/Export Syntax Rules

## Overview
Types must be explicitly marked with brackets `[]`, and only one item per bracket set is allowed for exports and one per bracket in imports.

## Valid Import Syntax

### Single function import
```bpl
import funcName from "./module.bpl";
```

### Single type import
```bpl
import [TypeName] from "./module.bpl";
```

### Multiple function imports
```bpl
import func1, func2, func3 from "./module.bpl";
```

### Multiple type imports (each type in separate brackets)
```bpl
import [Type1], [Type2], [Type3] from "./module.bpl";
```

### Mixed imports (functions and types)
```bpl
import func1, [Type1], [Type2], func2 from "./module.bpl";
```

```bpl
import [Point], [Circle], circleArea from "./geometry.bpl";
```

## Valid Export Syntax

### Single function export
```bpl
export funcName;
```

### Single type export
```bpl
export [TypeName];
```

### Multiple exports (separate statements)
```bpl
export func1;
export func2;
export [Type1];
export [Type2];
```

## Invalid Syntax (Will Cause Parse Errors)

### ❌ Multiple items in one export statement
```bpl
export func1, func2;  // ERROR: Only one item per export statement
```

### ❌ Multiple types in one bracket set
```bpl
export [Type1, Type2];  // ERROR: Only one type per []
```

```bpl
import [Type1, Type2] from "./module.bpl";  // ERROR: Only one type per []
```

### ❌ Mixing types and functions in brackets
```bpl
export [Type1, func1];  // ERROR: Can't mix types and functions in []
```

## Design Rationale

1. **Explicit Type Marking**: Types are wrapped in `[]` to make it immediately clear what's a type vs a function/value
2. **One Type Per Bracket**: Prevents confusion and makes parsing simpler
3. **One Export Per Statement**: Forces cleaner, more readable code with explicit exports
4. **Flexible Imports**: Allows combining multiple imports from the same module while maintaining clarity

## Real-World Examples

See the module_resolution example files for complete working examples:
- `math_utils.bpl` - Exporting functions
- `geometry.bpl` - Exporting both types and functions
- `physics.bpl` - Complex mixed exports
- `main.bpl` - Mixed imports from multiple modules
