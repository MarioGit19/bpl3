# Test just unit variant

enum Message {
    Quit,
}

frame main() ret int {
    local _quit: Message = Message.Quit;
    return 0;
}
