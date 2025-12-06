import printf, exit from "libc";

struct MyError {
    code: u32,
}

frame rethrow_helper() {
    try {
        local err: MyError;
        err.code = 500;
        throw err;
    } catch (e: MyError) {
        call printf("Caught error in helper: %d. Rethrowing...\n", e.code);
        throw e;
    }
}

frame main() {
    call printf("Testing rethrow...\n");
    try {
        call rethrow_helper();
    } catch (e: MyError) {
        call printf("Caught rethrown error in main: %d\n", e.code);
        if e.code == 500 {
            call printf("Rethrow verification passed.\n");
        } else {
            call printf("Rethrow verification failed.\n");
            call exit(1);
        }
    }
}
