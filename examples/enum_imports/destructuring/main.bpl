# Test pattern destructuring with tuple variant data

import [Message] from "../enums.bpl";

extern printf(fmt: string, ...);

frame test_add() ret int {
    local msg: Message = Message.Move(5, 10);
    return match (msg) {
        Message.Quit => 0,
        Message.Move(x, y) => x + y,
        Message.Write(text) => 99,
    };
}

frame test_multiply() ret int {
    local msg: Message = Message.Move(3, 7);
    return match (msg) {
        Message.Quit => 0,
        Message.Move(a, b) => a * b,
        Message.Write(t) => 0,
    };
    # 3 * 7 = 21
}

frame test_subtract() ret int {
    local msg: Message = Message.Move(20, 15);
    return match (msg) {
        Message.Quit => 0,
        Message.Move(x, y) => x - y,
        Message.Write(s) => 0,
    };
    # 20 - 15 = 5
}

frame main() ret int {
    local add_result: int = test_add();
    local mul_result: int = test_multiply();
    local sub_result: int = test_subtract();

    printf("Add: %d\n", add_result);
    printf("Multiply: %d\n", mul_result);
    printf("Subtract: %d\n", sub_result);

    # Should return 15 + 21 + 5 = 41
    return add_result + mul_result + sub_result;
}
