extern printf(fmt: string, ...);

struct Point {
    x: int,
    y: int,
}

frame main() ret int {
    # Test 1: Struct with all zeros should work
    printf("Test 1: Zero-valued struct\n");
    local p1: Point = Point { x: 0, y: 0 };
    printf("p1.x = %d, p1.y = %d\n", p1.x, p1.y);

    # Test 2: Normal struct works
    printf("\nTest 2: Normal struct\n");
    local p2: Point = Point { x: 10, y: 20 };
    printf("p2.x = %d, p2.y = %d\n", p2.x, p2.y);

    # Test 3: Null struct traps
    printf("\nTest 3: Null struct (should trap)\n");
    local p3: Point = null;
    printf("About to access p3.x...\n");

    try {
        local val: int = p3.x; # Should trap here
        printf("ERROR: Should not reach here\n");
    } catch (e: NullAccessError) {
        printf("Caught: %s in %s (expr: %s)\n", e.message, e.function, e.expression);
    }
    printf("\nAll tests passed!\n");
    return 0;
}
