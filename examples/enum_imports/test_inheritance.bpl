# Test enum inheritance syntax

enum BaseMessage {
    Quit,
    Info(string),
}

# Try to extend BaseMessage
enum ExtendedMessage : BaseMessage {
    Move(int, int),
    Write(string),
}

frame main() ret int {
    local msg: ExtendedMessage = ExtendedMessage.Move(10, 20);
    return 0;
}
