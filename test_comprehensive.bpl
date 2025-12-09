# Imports & Exports
import [print, println] from "io";
export MyStruct;

# Type Aliases
type ID = int;
type Callback<T> = Func<void>(T);

# Structs
struct Point {
    x: int,
    y: int,
    static new(x: int, y: int) ret Point {
        local p: Point;
        p.x = x;
        p.y = y;
        return p;
    }
}

struct Container<T> {
    data: T[],
    frame push(val: T) ret void {
        # ...
    }
}

# Globals
global MAX_COUNT: int = 100;
global table: int[10][10];

# Externs
extern malloc(size: int) ret *void;
extern printf(fmt: *char, ...) ret int;

# Functions
frame main() ret int {
    # Variables
    local a: int = 10;
    local b: float = 3.14;
    local ptr: *int = &a;
    # local (x: int, y: int) = getCoords(); # Destructuring needs a function to call

    # Control Flow
    if a > 5 {
        print("Big");
    } else if a == 5 {
        print("Equal");
    } else {
        print("Small");
    }

    loop a > 0 {
        a = a - 1;
        if a == 5 { continue; }
        if a == 2 { break; }
    }

    switch a {
        case 1: { print("One"); }
        case 2: { print("Two"); }
        default: { print("Other"); }
    }

    try {
        throw 404;
    } catch(e: int) {
        print("Error");
    } catchOther {
        print("Unknown");
    }

    # Expressions
    local c: int = a + cast<int>(b) * 2;
    c += 1;
    local isValid: bool = true && (a < cast<int>(b));
    local val: int = isValid ? 1 : 0;
    
    # Pointers & Arrays
    local arr: int[5];
    arr[0] = 1;
    local p: *int = &arr[0];
    *p = 2;

    # Cast & Sizeof & Match
    local v: *void = cast<*void>(p);
    local sz: int = sizeof(int);
    local sz2: int = sizeof(v);
    
    match<int>(a);

    # ASM
    asm {
        mov rax, 1
        int 0x80
    }

    return 0;
}
