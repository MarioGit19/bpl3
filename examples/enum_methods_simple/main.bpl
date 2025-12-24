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
    return color.toCode();
}

frame main() ret int {
    if (testColor() == 1) {
        return 0;
    }
    return 1;
}
