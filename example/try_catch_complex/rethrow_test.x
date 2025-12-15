import exit from "libc";
import [Console] from "std/io.x";

struct MyError {
    code: u32,
}

frame rethrow_helper() {
    try {
        local err: MyError;
        err.code = 500;
        throw err;
    } catch (e: MyError) {
        call Console.log("Caught error in helper: ", e.code, ". Rethrowing...");
        throw e;
    }
}

frame main() {
    call Console.log("Testing rethrow...");
    try {
        call rethrow_helper();
    } catch (e: MyError) {
        call Console.log("Caught rethrown error in main: ", e.code);
        if e.code == 500 {
            call Console.log("Rethrow verification passed.");
        } else {
            call Console.log("Rethrow verification failed.");
            call exit(1);
        }
    }
}
