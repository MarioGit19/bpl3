# Test matching only one variant with wildcard

enum Message {
    Quit,
    Move(int, int),
    Write(string),
}

frame main() ret int {
    local msg: Message = Message.Quit;

    # Check only for Quit, use wildcard for others
    return match (msg) {
        Message.Quit => 100,
        _ => 0,
    };
}
