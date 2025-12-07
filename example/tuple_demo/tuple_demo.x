# Tuple Demonstration
# This example showcases tuple types, literals, destructuring, and member access

import printf from "libc";

# Example 1: Basic tuple creation and access
frame test_basic_tuples() ret u8 {
    # Create a tuple with explicit type (using i64 for integer literals)
    local coords: (i64, i64) = (10, 20);

    # Access tuple elements using .0, .1 syntax
    call printf("Coordinates: (%ld, %ld)\n", coords.0, coords.1);

    # Create tuple with different types
    local mixed: (i64, i64, i64) = (42, 1000, -50);
    call printf("Mixed tuple: (%ld, %ld, %ld)\n", mixed.0, mixed.1, mixed.2);

    return 0;
}

# Example 2: Tuples as return values (multiple return values)
frame divide_with_remainder(a: i64, b: i64) ret (i64, i64) {
    local quotient: i64 = a / b;
    local remainder: i64 = a % b;
    return (quotient, remainder);
}

frame test_tuple_return() ret u8 {
    local result: (i64, i64) = call divide_with_remainder(17, 5);
    call printf("17 / 5 = %ld remainder %ld\n", result.0, result.1);
    return 0;
}

# Example 3: Destructuring - extract tuple elements into separate variables
frame test_destructuring() ret u8 {
    # Create a tuple
    local point: (i64, i64, i64) = (100, 200, 300);

    # Destructure with explicit types
    local (x: i64, y: i64, z: i64) = point;
    call printf("Destructured (explicit types): x=%ld, y=%ld, z=%ld\n", x, y, z);

    # Another example with explicit types
    local another_point: (i64, i64) = (50, 75);
    local (a: i64, b: i64) = another_point;
    call printf("Destructured: a=%ld, b=%ld\n", a, b);

    return 0;
}

# Example 4: Tuples with pointers
frame test_tuple_with_pointers() ret u8 {
    local val1: i64 = 100;
    local val2: i64 = 200;

    # Tuple of pointers
    local ptrs: (*i64, *i64) = (&val1, &val2);

    # Extract pointers first, then dereference
    local p1: *i64 = ptrs.0;
    local p2: *i64 = ptrs.1;

    call printf("Values via pointers: %ld, %ld\n", *p1, *p2);

    return 0;
}

# Example 5: Swapping values using tuples
frame swap(a: i64, b: i64) ret (i64, i64) {
    return (b, a);
}

frame test_swap() ret u8 {
    local x: i64 = 10;
    local y: i64 = 20;

    call printf("Before swap: x=%ld, y=%ld\n", x, y);

    local swapped: (i64, i64) = call swap(x, y);
    x = swapped.0;
    y = swapped.1;

    call printf("After swap: x=%ld, y=%ld\n", x, y);

    return 0;
}

# Main function running all tests
frame main() ret u8 {
    call printf("=== Tuple Demo ===\n\n");

    call printf("Test 1: Basic Tuples\n");
    call test_basic_tuples();

    call printf("\nTest 2: Tuple as Return Value\n");
    call test_tuple_return();

    call printf("\nTest 3: Destructuring\n");
    call test_destructuring();

    call printf("\nTest 4: Tuples with Pointers\n");
    call test_tuple_with_pointers();

    call printf("\nTest 5: Swapping Values\n");
    call test_swap();

    call printf("\n=== All Tests Passed! ===\n");
    return 0;
}
