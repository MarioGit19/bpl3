# Test enum as return type

enum Color {
    Red,
    Green,
    Blue,
}

frame get_blue() ret Color {
    return Color.Blue;
}

frame main() ret int {
    local c: Color = get_blue();
    return match (c) {
        Color.Red => 0,
        Color.Green => 1,
        Color.Blue => 2,
    };
}
