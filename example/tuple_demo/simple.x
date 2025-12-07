# Simple tuple test
import printf from "libc";

frame main() ret u8 {
    # Simple tuple with i64 (default integer type)
    local t: (i64, i64) = (10, 20);
    call printf("Tuple: (%ld, %ld)\n", t.0, t.1);
    return 0;
}
