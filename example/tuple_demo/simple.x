# Simple tuple test
import [Console] from "std/io.x";

frame main() ret u8 {
    # Simple tuple with i64 (default integer type)
    local t: (i64, i64) = (10, 20);
    call Console.log("Tuple: (", t.0, ", ", t.1, ")");
    return 0;
}
