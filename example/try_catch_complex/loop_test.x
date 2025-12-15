import exit from "libc";
import [Console] from "std/io.x";

frame main() {
    call Console.log("Testing throw from loop...");
    try {
        local i: u64 = 0;
        loop {
            if i >= 10 {
                break;
            }
            if i == 5 {
                throw i;
            }
            i = i + 1;
        }
    } catch (e: u64) {
        call Console.log("Caught from loop: ", e, "u");
        if e == 5 {
            call Console.log("Loop throw verification passed.");
        } else {
            call Console.log("Loop throw verification failed.");
            call exit(1);
        }
    }
}
