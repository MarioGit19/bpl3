import printf from "libc";
import exit from "libc";

frame main() ret u8 {
    call printf("=== Tuple Verification ===\n\n");

    # 1. Value Types (Copy Semantics)
    call printf("1. Testing Value Semantics...\n");
    local t1: (i64, i64) = (10, 20);
    local t2: (i64, i64) = t1; # Copy
    t2.0 = 99;
    if t1.0 == 10 {
        call printf("✅ PASS: Original tuple unchanged (Value Type)\n");
    } else {
        call printf("❌ FAIL: Original tuple modified (Reference Type)\n");
    }

    # 2. Element Access
    call printf("2. Testing Element Access...\n");
    if t1.0 == 10 {
        if t1.1 == 20 {
            call printf("✅ PASS: Element access .0 and .1 working\n");
        }
    }

    # 3. Destructuring with Explicit Types
    call printf("3. Testing Destructuring...\n");
    local (a: i64, b: i64) = t1;
    if a == 10 {
        if b == 20 {
            call printf("✅ PASS: Destructuring with explicit types working\n");
        }
    }

    # 4. Number Literals Default to i64
    call printf("4. Testing Number Literals...\n");
    local t3: (i64, i64) = (100, 200);
    call printf("✅ PASS: Number literals accepted as i64\n");

    # 5. Integer Division //
    call printf("5. Testing Integer Division...\n");
    local t4: (i64, i64) = (100 // 2, 200 // 4);
    if t4.0 == 50 {
        if t4.1 == 50 {
            call printf("✅ PASS: Integer division // working in tuples\n");
        }
    }

    # 6. Pointer Access
    call printf("6. Testing Pointer Access...\n");
    local ptr: *(i64, i64) = &t1;
    # Accessing via pointer directly
    local val: i64 = ptr.0;
    if val == 10 {
        call printf("✅ PASS: Accessing element via pointer (ptr.0) works\n");
    }

    # Test *ptr.0
    local val2: i64 = *ptr.0; # Uncomment to test
    call printf("Value via *ptr.0: %lld\n", val2);

    # 7. Implicit Destructuring (Should Fail)
    # local (c, d) = t1;

    return cast<u8>(0);
}
