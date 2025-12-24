extern printf(fmt: string, ...);

struct Inner {
    value: int,
}

struct Outer {
    inner: Inner,
    data: int,
}

struct Node {
    next: *Node,
    value: int,
}

struct Container {
    items: int[10],
    count: int,
}

# Test 1: Nested struct member access on null
frame testNestedAccess() {
    printf("Test 1: Nested member access on null\n");
    local outer: Outer = null;
    local _val: int = outer.inner.value; # Should trap on outer.inner
    printf("Should not reach here\n");
}

# Test 2: Array access on null struct
frame testArrayInStruct() {
    printf("Test 2: Array in null struct\n");
    local c: Container = null;
    local _val: int = c.items[5]; # Should trap on c.items
    printf("Should not reach here\n");
}

# Test 3: Multiple null objects in same function
frame testMultipleNulls() {
    printf("Test 3: Multiple null objects\n");
    local a: Outer = null;
    local b: Container = null;

    # First access should trap
    local _x: int = a.data;

    # This should never execute
    local _y: int = b.count;
    printf("Should not reach here\n");
}

# Test 4: Null check in loop
frame testNullInLoop() {
    printf("Test 4: Null in loop\n");
    local outer: Outer = null;
    local i: int = 0;

    loop (i < 5) {
        local _val: int = outer.data; # Should trap on first iteration
        i = i + 1;
    }
    printf("Should not reach here\n");
}

# Test 5: Assignment then null access
frame testAssignThenAccess() {
    printf("Test 5: Assign then access null\n");
    local outer: Outer;
    outer.data = 42; # Valid assignment

    # Now set to null
    outer = null;

    # This should trap
    local _val: int = outer.data;
    printf("Should not reach here\n");
}

# Test 6: Conditional with null
frame testConditionalNull() {
    printf("Test 6: Conditional with null\n");
    local outer: Outer = null;

    if (outer == null) {
        printf("Correctly detected null\n");
        # But accessing it should still trap
        local _val: int = outer.data;
    }
    printf("Should not reach here\n");
}

# Test 7: Array of structs
frame testStructArrayElement() {
    printf("Test 7: Struct array element\n");
    local arr: Outer[3];
    arr[1] = null;
    local _val: int = arr[1].data; # Should trap
    printf("Should not reach here\n");
}

# Test 8: Deep nested access
frame testDeepNested() {
    printf("Test 8: Deep nested access\n");
    local outer: Outer = null;
    # Even though we're accessing nested field, trap should happen on first null access
    local _val: int = outer.inner.value;
    printf("Should not reach here\n");
}

frame main() ret int {
    printf("=== Null Edge Cases Test ===\n\n");

    # Test 1: Nested member access
    try {
        testNestedAccess();
        printf("ERROR: Should have thrown!\n");
    } catch (e: NullAccessError) {
        printf("Caught Test 1: %s in %s (expr: %s)\n", e.message, e.function, e.expression);
    }
    # Test 2: Array in struct
    try {
        testArrayInStruct();
        printf("ERROR: Should have thrown!\n");
    } catch (e: NullAccessError) {
        printf("Caught Test 2: %s in %s (expr: %s)\n", e.message, e.function, e.expression);
    }
    # Test 3: Multiple nulls - only first should throw
    try {
        testMultipleNulls();
        printf("ERROR: Should have thrown!\n");
    } catch (e: NullAccessError) {
        printf("Caught Test 3: %s in %s (expr: %s)\n", e.message, e.function, e.expression);
    }
    # Test 4: Null in loop
    try {
        testNullInLoop();
        printf("ERROR: Should have thrown!\n");
    } catch (e: NullAccessError) {
        printf("Caught Test 4: %s in %s (expr: %s)\n", e.message, e.function, e.expression);
    }
    # Test 5: Assign then access
    try {
        testAssignThenAccess();
        printf("ERROR: Should have thrown!\n");
    } catch (e: NullAccessError) {
        printf("Caught Test 5: %s in %s (expr: %s)\n", e.message, e.function, e.expression);
    }
    # Test 6: Conditional null
    try {
        testConditionalNull();
        printf("ERROR: Should have thrown!\n");
    } catch (e: NullAccessError) {
        printf("Caught Test 6: %s in %s (expr: %s)\n", e.message, e.function, e.expression);
    }
    # Test 7: Struct array element
    try {
        testStructArrayElement();
        printf("ERROR: Should have thrown!\n");
    } catch (e: NullAccessError) {
        printf("Caught Test 7: %s in %s (expr: %s)\n", e.message, e.function, e.expression);
    }
    # Test 8: Deep nested
    try {
        testDeepNested();
        printf("ERROR: Should have thrown!\n");
    } catch (e: NullAccessError) {
        printf("Caught Test 8: %s in %s (expr: %s)\n", e.message, e.function, e.expression);
    }
    printf("\nAll tests passed!\n");
    return 0;
}
