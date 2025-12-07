import exit from "libc";
import [Console] from "std/io.x";

frame test_u64() {
    call Console.log("Testing u64 throw...");
    try {
        throw 12345;
    } catch (e: u64) {
        call Console.log("Caught u64: ", e, "u");
        if e != 12345 {
            call Console.log("u64 verification failed.");
            call exit(1);
        }
    }
}

frame test_string() {
    call Console.log("Testing string throw...");
    try {
        throw "Error Message";
    } catch (e: *u8) {
        call Console.log("Caught string: ", e);
    }
}

frame main() {
    call test_u64();
    call test_string();
    call Console.log("Primitive tests passed.");
}
