# Simplified enum methods test

enum Color {
    Red,
    Green,

    frame to_code(this: Color) ret int {
        return match (this) {
            Color.Red => 1,
            Color.Green => 2,
        };
    }
}

frame test_color() ret int {
    local color: Color = Color.Red;
    return color.to_code();
}

frame main() ret int {
    return test_color();
}
