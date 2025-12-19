# Test namespace import of enums

import * as Enums from "./enums.bpl";

frame main() ret int {
    local c: Enums.Color = Enums.Color.Green;
    local s: Enums.Status = Enums.Status.Busy;
    
    local color_code: int = match (c) {
        Enums.Color.Red => 1,
        Enums.Color.Green => 2,
        Enums.Color.Blue => 3,
    };
    
    local status_code: int = match (s) {
        Enums.Status.Ready => 10,
        Enums.Status.Busy => 20,
        Enums.Status.Error => 30,
    };
    
    # Should return 2 + 20 = 22
    return color_code + status_code;
}
