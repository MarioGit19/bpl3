extern printf(fmt: string, ...);

struct Point {
    x: int,
    y: int,
}

struct Rectangle {
    topLeft: Point,
    bottomRight: Point,
}

# Test passing null as parameter
frame processPoint(p: Point) ret int {
    return p.x + p.y; # Should trap if p is null
}

# Test returning null
frame createNullPoint() ret Point {
    local p: Point = null;
    return p; # Returning null object
}

# Test null in function call chain
frame getX(p: Point) ret int {
    return p.x;
}

frame doubleX(p: Point) ret int {
    local x: int = getX(p);
    return x * 2;
}

# Test null with pass-by-value semantics
frame modifyPoint(p: Point) {
    p.x = 100; # Should trap if p is null
    p.y = 200;
}

# Test struct containing struct
frame processRectangle(r: Rectangle) ret int {
    return r.topLeft.x; # Should work if r is not null, trap on r.topLeft if r is null
}

frame main() ret int {
    printf("=== Null Function Parameters Test ===\n\n");

    # Test 1: Pass null directly
    printf("Test 1: Passing null as parameter\n");
    local p: Point = null;
    local _result: int = processPoint(p); # Should trap inside processPoint

    printf("Should not reach here\n");
    return 0;
}
