# Simplified enum methods test

enum Color {
    Red,
    Green,

    frame toCode(this: Color) ret int {
        return match (this) {
            Color.Red => 1,
            Color.Green => 2,
        };
    }
}

frame testColor() ret int {
    local color: Color = Color.Red;
    return color.to_code();
}

frame main() ret int {
    return testColor();
}
