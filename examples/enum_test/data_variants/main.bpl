# Test enum variants with associated data

enum Message {
    Quit,
    Move(int, int),
    Write(string),
}

frame main() ret int {
    # Test unit variant
    local quit: Message = Message.Quit;
    
    # Test tuple variant with data
    local move_msg: Message = Message.Move(10, 20);
    
    # Test another tuple variant
    local write_msg: Message = Message.Write("hello");
    
    return 0;
}
