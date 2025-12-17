extern printf(fmt: string, ...);
struct Data {
    value: int,
    valid: bool,
}

# Return null conditionally
frame maybeGetData(success: bool) ret Data {
    if (success) {
        local d: Data;
        d.value = 42;
        d.valid = true;
        return d;
    }
    # Return null on failure
    local null_data: Data = null;
    return null_data;
}

# Use returned null value
frame processData(d: Data) ret int {
    # Just access d.value directly
    return d.value; # Should trap here since d is null
}

# Chain function calls with null return
frame getData() ret Data {
    local d: Data = null;
    return d;
}

frame extractValue(d: Data) ret int {
    return d.value;
}

frame main() ret int {
    printf("=== Null Return Values Test ===\n\n");

    printf("Test 1: Returning null from function\n");
    local data: Data = maybeGetData(false);

    printf("Test 2: Using returned null value\n");

    try {
        local result: int = processData(data);
        printf("ERROR: Should have thrown!\n");
    } catch (e: NullAccessError) {
        printf("Caught: %s in %s (expr: %s)\n", e.message, e.function, e.expression);
    }
    printf("Test completed successfully\n");
    return 0;
}
