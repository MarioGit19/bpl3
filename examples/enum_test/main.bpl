# Test basic enum parsing

enum Color {
    Red,
    Green,
    Blue,
}

enum Message {
    Quit,
    Move(int, int),
    Write(string),
}

enum Shape {
    Circle { radius: float },
    Rectangle { width: float, height: float },
    Point,
}

enum Option<T> {
    Some(T),
    None,
}

frame test_match(c: Color) ret int {
    return match (c) {
        Color.Red => 0,
        Color.Green => 1,
        Color.Blue => 2,
    };
}

frame main() ret int {
    local c: Color = Color.Red;
    local result: int = test_match(c);
    return result;
}
