import exit from "libc";
import [Console] from "std/io.x";

frame assert(condition: u64, message: *u8) {
    if condition == 0 {
        call Console.log("FAIL: ", message);
        call exit(1);
    }
    call Console.log("PASS: ", message);
}

export assert;
