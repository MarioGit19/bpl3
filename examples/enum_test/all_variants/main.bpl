# Test all enum variants

enum Color {
    Red,
    Green,
    Blue,
}

frame test_red() ret int {
    local c: Color = Color.Red;
    return match (c) {
        Color.Red => 1,
        Color.Green => 0,
        Color.Blue => 0,
    };
}

frame test_green() ret int {
    local c: Color = Color.Green;
    return match (c) {
        Color.Red => 0,
        Color.Green => 2,
        Color.Blue => 0,
    };
}

frame test_blue() ret int {
    local c: Color = Color.Blue;
    return match (c) {
        Color.Red => 0,
        Color.Green => 0,
        Color.Blue => 3,
    };
}

frame main() ret int {
    local r: int = test_red();
    local g: int = test_green();
    local b: int = test_blue();
    
    # Should return 6 if all tests pass (1 + 2 + 3)
    return r + g + b;
}
