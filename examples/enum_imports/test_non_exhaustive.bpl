# Test non-exhaustive match

enum Message {
    Quit,
    Move(int, int),
    Write(string),
}

frame main() ret int {
    local msg: Message = Message.Move(10, 20);

    # Missing Write variant - is this an error?
    return match (msg) {
        Message.Quit => 0,
        Message.Move(x, y) => 1,
    };
}
