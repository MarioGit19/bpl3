# Test mixing enum types in match

enum Message {
    Quit,
    Move(int, int),
}

enum Status {
    Ready,
    Busy,
}

frame main() ret int {
    local msg: Message = Message.Quit;

    # Try to mix Message and Status types
    return match (msg) {
        Message.Quit => 1,
        Message.Move(x, y) => 2,
        Status.Ready => 3,
    };
}
