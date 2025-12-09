# Test type compatibility checking

struct Point {
    x: int,
    y: int,
}

frame add(a: int, b: int) ret int {
    return a + b;
}

frame test_valid_types() ret void {
    # Valid: matching types
    local i: int = 42;
    local f: float = 3.14;
    local s: string = "hello";
    
    # Valid: function call with correct args
    local result: int = add(10, 20);
}

frame test_pointer_arithmetic() ret void {
    local ptr: *int = null;
    local offset: int = 5;
    # Valid: pointer + int
    local newPtr: *int = ptr + offset;
}

