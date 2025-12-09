# Comprehensive test of all BPL3 features# Imports & Exportsextern printf(fmt: string, ...) ret int;# Imports & Exports



# Type Aliases# import [print, println] from "io"; 

type ID = int;

type Callback = Func<void>(int);# export MyStruct;extern malloc(size: int) ret string;import [print, println] from "io";



# Structs

struct Point {

    x: int,extern printf(fmt: string, ...) ret int;extern free(ptr: string) ret void;export MyStruct;

    y: int,

}extern malloc(size: int) ret string;



struct Container {extern free(ptr: string) ret void;

    value: int,

}



# Externs# Type Aliasesstruct Point {# Type Aliases

extern printf(fmt: string, ...) ret int;

extern malloc(size: int) ret string;type ID = int;

extern free(ptr: string) ret void;

type ID = int;

# Globals

global g_val: int = 42;# Structs

global g_array: int[3];

type Callback<T> = Func<void>(T);

# Main function

frame main() ret int {struct Point {    

    # Test globals

    printf("Global: %d\n", g_val);    x: int,

    

    # Test struct literals    y: int,

    local p: Point = Point { x: 10, y: 20 };

    printf("Point: (%d, %d)\n", p.x, p.y);}

    

    # Test pointers and address-of/dereference# Structs

    local ptr: *int = &p.x;

    *ptr = 30;struct Container {

    printf("After *ptr=30: (%d, %d)\n", p.x, p.y);

        data: int

    # Test arrays and indexing

    local arr: int[5];}

    local i: int = 0;

    loop (i < 5) {global g_val: int = 100;

        arr[i] = i * i;

        i = i + 1;frame main() ret int {    y: int,

    }

    printf("arr[3] = %d\n", arr[3]);frame main() ret int {

    

    # Test sizeof operator    # Globals    // Globals    printf("Global: %d\n", g_val);

    printf("sizeof(Point) = %d\n", sizeof(Point));

    printf("sizeof(int) = %d\n", sizeof(int));    printf("Global: %d\n", g_val);

    

    # Test casting and dynamic memory        /*

    local dyn: *int = cast<*int>(malloc(sizeof(int)));

    *dyn = 999;    # Struct Literal    // Struct Literal        p.y = y;

    printf("Dynamic value: %d\n", *dyn);

    free(cast<string>(dyn));    local p: Point = Point { x: 10, y: 20 };

    

    # Test control flow    printf("Point: %d, %d\n", p.x, p.y);    local p: Point = Point { x: 10, y: 20 };        return p;

    local val: int = 10;

    if val > 5 {    

        printf("val > 5\n");

    } else if val == 5 {    # Pointers    printf("Point: %d, %d\n", p.x, p.y);    }

        printf("val == 5\n");

    } else {    local ptr: *int = &p.x;

        printf("val < 5\n");

    }    *ptr = 30;    }

    

    # Test switch    printf("Point after *ptr=30: %d, %d\n", p.x, p.y);

    switch val {

        case 10: {        // Pointers

            printf("val is 10\n");

        }    # Arrays

        case 20: {

            printf("val is 20\n");    local arr: int[5];    local ptr: *int = &p.x;struct Container<T> {

        }

        default: {    local i: int = 0;

            printf("val is other\n");

        }    loop (i < 5) {    *ptr = 30;    data: T[],

    }

            arr[i] = i * i;

    # Test loop with break/continue

    local j: int = 0;        i = i + 1;    printf("Point after *ptr=30: %d, %d\n", p.x, p.y);    frame push(val: T) ret void {

    loop (j < 10) {

        j = j + 1;    }

        if j == 3 {

            continue;    printf("arr[3] = %d\n", arr[3]);            # ...

        }

        if j == 8 {    

            break;

        }    # Sizeof    // Arrays    }

        printf("j = %d\n", j);

    }    printf("sizeof(Point) = %d\n", sizeof(Point));

    

    # Test try/catch        local arr: int[5];}

    try {

        if val == 10 {    # Casts & Dynamic Memory

            throw 404;

        }    local dyn: *int = cast<*int>(malloc(sizeof(int)));    local i: int = 0;

    } catch (e: int) {

        printf("Caught error: %d\n", e);    *dyn = 999;

    } catchOther {

        printf("Unknown error\n");    printf("Dynamic: %d\n", *dyn);    loop (i < 5) {# Globals

    }

        free(cast<string>(dyn));

    # Test expressions and operators

    local a: int = 5;            arr[i] = i * i;global MAX_COUNT: int = 100;

    local b: int = 3;

    local c: int = a + b * 2;    return 0;

    local d: int = (a + b) * 2;

    printf("c = %d, d = %d\n", c, d);}        i = i + 1;global table: int[10][10];

    

    # Test compound assignment

    c += 10;    }

    c -= 5;

    c *= 2;    printf("arr[3] = %d\n", arr[3]);# Externs

    c /= 2;

    printf("c after ops = %d\n", c);    extern malloc(size: int) ret *void;

    

    # Test logical operators    // Sizeofextern printf(fmt: *char, ...) ret int;

    local isTrue: bool = true && (a > b);

    local isFalse: bool = false || (a < b);    printf("sizeof(Point) = %d\n", sizeof(Point));

    printf("isTrue = %d, isFalse = %d\n", cast<int>(isTrue), cast<int>(isFalse));

        # Functions

    # Test ternary operator

    local result: int = a > b ? 100 : 200;    // Casts & Dynamic Memoryframe main() ret int {

    printf("result = %d\n", result);

        local dyn: *int = cast<*int>(malloc(sizeof(int)));    # Variables

    # Test bitwise operators

    local x: int = 0b1010;    *dyn = 999;    local a: int = 10;

    local y: int = 0b1100;

    printf("x & y = %d\n", x & y);    printf("Dynamic: %d\n", *dyn);    local b: float = 3.14;

    printf("x | y = %d\n", x | y);

    printf("x ^ y = %d\n", x ^ y);    free(cast<string>(dyn));    local ptr: *int = &a;

    printf("~x = %d\n", ~x);

    printf("x << 1 = %d\n", x << 1);        # local (x: int, y: int) = getCoords(); # Destructuring needs a function to call

    printf("x >> 1 = %d\n", x >> 1);

        return 0;

    # Test array literals

    local nums: int[3];}    # Control Flow

    nums[0] = 1;    if a > 5 {

    nums[1] = 2;        print("Big");

    nums[2] = 3;    } else if a == 5 {

    printf("nums = [%d, %d, %d]\n", nums[0], nums[1], nums[2]);        print("Equal");

        } else {

    return 0;        print("Small");

}    }



# Helper function to test function declarations    loop a > 0 {

frame add(a: int, b: int) ret int {        a = a - 1;

    return a + b;        if a == 5 { continue; }

}        if a == 2 { break; }

    }

# Test asm block

frame test_asm() ret void {    switch a {

    asm {        case 1: { print("One"); }

        nop        case 2: { print("Two"); }

    }        default: { print("Other"); }

}    }


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
