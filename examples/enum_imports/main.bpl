# Test importing enums

import [Color], [Status], [Message] from "./enums.bpl";

frame testColor() ret int {
    local c: Color = Color.Red;
    return match (c) {
        Color.Red => 1,
        Color.Green => 2,
        Color.Blue => 3,
    };
}

frame testStatus() ret int {
    local s: Status = Status.Busy;
    return match (s) {
        Status.Ready => 10,
        Status.Busy => 20,
        Status.Error => 30,
    };
}

frame testMessage() ret int {
    local msg: Message = Message.Move(5, 10);
    # Pattern destructuring now works! Variables x, y, text can be used.
    return match (msg) {
        Message.Quit => 100,
        Message.Move(x, y) => 200,
        Message.Write(text) => 300,
    };
}

frame main() ret int {
    local color_result: int = testColor();
    local status_result: int = testStatus();
    local message_result: int = testMessage();

    # Returns 1 + 20 + 200 = 221 (pattern destructuring implemented!)
    return color_result + status_result + message_result;
}
