import [Console] from "std/io.x";
import exit from "libc";

frame main() ret u8 {
    call Console.log("=== Tuple Verification ===\n");

    # 1. Value Types (Copy Semantics)
    call Console.log("1. Testing Value Semantics...");
    local t1: (i64, i64) = (10, 20);
    local t2: (i64, i64) = t1; # Copy
    t2.0 = 99;
    if t1.0 == 10 {
        call Console.log("✅ PASS: Original tuple unchanged (Value Type)");
    } else {
        call Console.log("❌ FAIL: Original tuple modified (Reference Type)");
    }

    # 2. Element Access
    call Console.log("2. Testing Element Access...");
    if t1.0 == 10 {
        if t1.1 == 20 {
            call Console.log("✅ PASS: Element access .0 and .1 working");
        }
    }

    # 3. Destructuring with Explicit Types
    call Console.log("3. Testing Destructuring...");
    local (a: i64, b: i64) = t1;
    if a == 10 {
        if b == 20 {
            call Console.log("✅ PASS: Destructuring with explicit types working");
        }
    }

    # 4. Number Literals Default to i64
    call Console.log("4. Testing Number Literals...");
    local t3: (i64, i64) = (100, 200);
    call Console.log("✅ PASS: Number literals accepted as i64");

    # 5. Integer Division //
    call Console.log("5. Testing Integer Division...");
    local t4: (i64, i64) = (100 // 2, 200 // 4);
    if t4.0 == 50 {
        if t4.1 == 50 {
            call Console.log("✅ PASS: Integer division // working in tuples");
        }
    }

    # 6. Pointer Access
    call Console.log("6. Testing Pointer Access...");
    local ptr: *(i64, i64) = &t1;
    # Accessing via pointer directly
    local val: i64 = ptr.0;
    if val == 10 {
        call Console.log("✅ PASS: Accessing element via pointer (ptr.0) works");
    }

    # Test *ptr.0
    local val2: i64 = *ptr.0; # Uncomment to test
    call Console.log("Value via *ptr.0: ", val2);

    # 7. Implicit Destructuring (Should Fail)
    # local (c, d) = t1;

    return cast<u8>(0);
}
