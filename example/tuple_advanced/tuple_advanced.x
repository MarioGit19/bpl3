import printf from "libc";
import exit from "libc";

# Non-generic version for i64 - returns value + error code
frame get_T_value<T>(ptr: *T) ret (i64, u8) {
    # Check for NULL pointer
    local null_check: *T = cast<*T>(0);
    if ptr == null_check {
        # Return 0 and error code 1
        return (0, cast<u8>(1));
    }
    return (cast<i64>(*ptr), cast<u8>(0));
}

# Generic function for safe division
frame safe_divide(a: i64, b: i64) ret (i64, u8) {
    local zero: i64 = 0;
    if b == zero {
        local error_result: (i64, u8) = (zero, cast<u8>(1));
        return error_result;
    }
    # Extract division to variable first (workaround for type inference)
    local quotient: i64 = a // b;
    local success_result: (i64, u8) = (quotient, cast<u8>(0));
    return success_result;
}

# Nested tuple example
frame get_rectangle_info() ret ((i64, i64), (i64, i64)) {
    local top_left: (i64, i64) = (10, 20);
    local bottom_right: (i64, i64) = (100, 200);
    return (top_left, bottom_right);
}

# Min/max function returning tuple
frame min_max_i64(a: i64, b: i64) ret (i64, i64) {
    if a < b {
        return (a, b);
    }
    return (b, a);
}

# Min/max for u8
frame min_max_u8(a: u8, b: u8) ret (u8, u8) {
    if a < b {
        return (a, b);
    }
    return (b, a);
}

frame main() ret u8 {
    call printf("=== Advanced Tuple Examples ===\n\n");

    # Test 1: Pointer value with valid pointer
    call printf("Test 1: get_i64_value with valid pointer\n");
    local x: i64 = 42;
    local ptr: *i64 = &x;
    local result1: (i64, u8) = call get_T_value<i64>(ptr);
    local (value1: i64, err1: u8) = result1;
    if err1 == cast<u8>(0) {
        call printf("Success! Value: %lld\n", value1);
    } else {
        call printf("Error retrieving value\n");
    }

    # Test 1b: Pointer value with u64
    call printf("\nTest 1b: get_T_value with u64\n");
    local y: u64 = 100;
    local ptr_u64: *u64 = &y;
    local result1b: (i64, u8) = call get_T_value<u64>(ptr_u64);
    local (value1b: i64, err1b: u8) = result1b;
    if err1b == cast<u8>(0) {
        call printf("Success! Value: %lld\n", value1b);
    } else {
        call printf("Error retrieving value\n");
    }

    # Test 2: Pointer value with NULL
    call printf("\nTest 2: get_i64_value with NULL pointer\n");
    local null_ptr: *i64 = cast<*i64>(0);
    local result2: (i64, u8) = call get_T_value<i64>(null_ptr);
    local (value2: i64, err2: u8) = result2;
    if err2 == cast<u8>(0) {
        call printf("Success! Value: %lld\n", value2);
    } else {
        local err2_i64: i64 = cast<i64>(err2);
        call printf("Error: NULL pointer detected (error code: %lld)\n", err2_i64);
    }

    # Test 3: Safe division - success case
    call printf("\nTest 3: Safe division - 20 / 4\n");
    local div_result1: (i64, u8) = call safe_divide(20, 4);
    local (quotient1: i64, div_err1: u8) = div_result1;
    if div_err1 == cast<u8>(0) {
        local quotient_i64: i64 = quotient1;
        call printf("Result: %lld\n", quotient_i64);
    } else {
        call printf("Error: Division by zero\n");
    }

    # Test 4: Safe division - error case
    call printf("\nTest 4: Safe division - 10 / 0\n");
    local div_result2: (i64, u8) = call safe_divide(10, 0);
    local (quotient2: i64, div_err2: u8) = div_result2;
    if div_err2 == cast<u8>(0) {
        call printf("Result: %lld\n", quotient2);
    } else {
        local err_i64: i64 = cast<i64>(div_err2);
        call printf("Error: Division by zero detected (error code: %lld)\n", err_i64);
    }

    # Test 5: min_max with i64
    call printf("\nTest 5: min_max with i64\n");
    local mm_result: (i64, i64) = call min_max_i64(15, 8);
    local (min_val: i64, max_val: i64) = mm_result;
    call printf("Min: %lld, Max: %lld\n", min_val, max_val);

    # Test 6: Nested tuples
    call printf("\nTest 6: Nested tuples for rectangle info\n");
    local rect_info: ((i64, i64), (i64, i64)) = call get_rectangle_info();
    local (top_left: (i64, i64), bottom_right: (i64, i64)) = rect_info;
    local (x1: i64, y1: i64) = top_left;
    local (x2: i64, y2: i64) = bottom_right;
    call printf("Top-left: (%lld, %lld), Bottom-right: (%lld, %lld)\n", x1, y1, x2, y2);

    call printf("\n=== All Advanced Tests Passed! ===\n");
    return cast<u8>(0);
}
