import printf from "libc";
import [String] from "std/string.x";

frame main() {
    # String demo
    local s1: String;
    s1.length = 0;
    call printf("Length: %d\n", call s1.len());
}
