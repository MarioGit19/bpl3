# BPL3 Language Specification

This document outlines the syntax, types, and constructs available in the BPL3 language.

## 1. Types

### Primitive Types

_Note: The grammar uses `Identifier` for types, implying these are defined in the standard library or built-in._

- `int` - signed integers 64 bit
- `uint` - unsigned integers 64 bit
- `float` - floats 64 bit
- `bool` (Boolean: `true`, `false`) - u1 if exists 0/1
- `char` (Character literals: `'c'`) - unsigned 8 bit
- `void` (Empty type)
- `null` (Null type)
- `nullptr` - null but compatible with pointers

### Composite Types

- **Pointers**: `*T` (e.g., `*int`, `**int`)
- **Arrays**: `T[]` or `T[N]` (e.g., `int[]`, `float[4]`)
- **Tuples**: `(T1, T2, ...)` (e.g., `(int, bool)`)
- **Functions**: `Func<ReturnType>(ArgType1, ArgType2, ...)` (e.g., `Func<void>(int, int)`)
- **Generics**: `List<T>`, `Map<K, V>`

## 2. Declarations

### Variables

Variables must be declared as `local` or `global`.

```bpl
local x: int;
local y: int = 10;
global MAX: int = 100;
local (a:int, b:uint) = tuple
```

### Type Aliases

Create new names for existing types.

```bpl
type ID = int;
type Point2D = (int, int);
type Callback = Func<void>(int);
type SortFunc<T> = Func<int>(T, T);
type IntArr = int[];
```

### Destructuring

Tuple destructuring is supported.

```bpl
local (a: int, b: bool) = getTuple();
(a,b)=tuple # a and b must be already declared at this point
(a,b) = (b,a)
```

### Constants

_Currently, there is no `const` keyword. Use `global` or `local`._

## 3. Functions

### Declaration

Functions can be `frame` (stack frame based) or `static` but only inside structs.

```bpl
frame main() ret int {
    return 0;
}

struct X {
    static add(a: int, b: int) ret int {
        return a + b;
    }
}

frame print(a:*char) {...}
```

### Generics

```bpl
frame identity<T>(val: T) ret T {
    local temp: T = val;
    return temp;
}
```

## 4. Structs

Structs can contain fields and methods.

```bpl
struct Point {
    x: int,
    y: int,

    static new(x: int, y: int) ret Point { ... }
}

struct Generic<T>{
    val: T,
    frame add<X>(a:T,b:X) ret (T,X){
        return (a,b);
    }
    static print<X>(obj:T, xx:X){
        printn(xx);
        print(obj.val);
        print(xx);
    }
}
```

## 5. Control Flow

### Conditionals

```bpl
if x > 0 {
    # ...
} else if x < 0 {
    # ...
} else {
    # ...
}
```

### Loops

The only loop construct is `loop`. It functions as a `while` loop.

```bpl
loop i < 10 {
    # ...
}

loop {
    # Infinite loop
    break;
}
```

### Switch

```bpl
switch val {
    case 1: { ... }
    default: { ... }
}
```

### Error Handling

```bpl
try {
    throw 1;
} catch(e: int) {
    # Handle error
} catch(e:bool){
    # Handle bool error
} catchOther {
    # Handle unknown
}
```

## 6. Expressions & Operators

### Operators

- **Arithmetic**: `+`, `-`, `*`, `/`, `%`
- **Logical**: `&&`, `||`, `!`
- **Bitwise**: `&`, `|`, `^`, `~`, `<<`, `>>`
- **Comparison**: `==`, `!=`, `<`, `<=`, `>`, `>=`
- **Assignment**: `=`, `+=`, `-=`, etc.
- **Ternary**: `cond ? trueVal : falseVal`

### Special Expressions

- **Cast**: `cast<int>(3.5)`
- **Sizeof**: `sizeof(int)` or `sizeof(var)`
- **Match**: `match<Type>(Expression | Type)` - Checks if the generic type matches the provided type or the type of the expression.
- **Address/Dereference**: `&var`, `*ptr`

## 7. Known Limitations / Disallowed Constructs

The following are **NOT** currently supported by the grammar:

- **For Loops**: No C-style `for(;;)` or `foreach`. Use `loop`.
- **Postfix Increment/Decrement**: `i++` and `i--` are not supported. Use `++i` or `i += 1`.
- **Enums**: No `enum` keyword.
- **Type Aliases**: No `type` or `typedef` keyword.
- **Visibility**: No `public` / `private` modifiers (all members are public).
- **Do-While**: No `do { ... } while` loop.
