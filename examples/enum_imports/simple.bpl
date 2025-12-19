# Simple enum import test with unit variants only

import [Color], [Status] from "./enums.bpl";

frame main() ret int {
    local c: Color = Color.Blue;
    local s: Status = Status.Error;

    local color_code: int = match (c) {
        Color.Red => 1,
        Color.Green => 2,
        Color.Blue => 3,
    };

    local status_code: int = match (s) {
        Status.Ready => 10,
        Status.Busy => 20,
        Status.Error => 30,
    };

    # Should return 3 + 30 = 33
    return color_code + status_code;
}
