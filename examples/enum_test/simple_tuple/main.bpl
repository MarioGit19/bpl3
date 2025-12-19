# Simple test with one tuple variant

enum Message {
    Move(int, int),
}

frame main() ret int {
    local msg: Message = Message.Move(10, 20);
    return 0;
}
