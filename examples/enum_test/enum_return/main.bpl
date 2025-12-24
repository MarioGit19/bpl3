# Test enum as return type

enum Color {
    Red,
    Green,
    Blue,
}

frame getBlue() ret Color {
    return Color.Blue;
}

frame main() ret int {
    local c: Color = getBlue();
    return match (c) {
        Color.Red => 0,
        Color.Green => 1,
        Color.Blue => 2,
    };
}
