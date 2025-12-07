import [Console] from "std/io.x";
import [String] from "std/string.x";

frame main() {
    # String demo
    local s1: String;
    s1.length = 0;
    call Console.log("Length: ", call s1.len());
}
