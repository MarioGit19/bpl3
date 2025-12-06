import printf, exit from "libc";

frame test_u64() {
    call printf("Testing u64 throw...\n");
    try {
        throw 12345;
    } catch (e: u64) {
        call printf("Caught u64: %lu\n", e);
        if e != 12345 {
            call printf("u64 verification failed.\n");
            call exit(1);
        }
    }
}

frame test_string() {
    call printf("Testing string throw...\n");
    try {
        throw "Error Message";
    } catch (e: *u8) {
        call printf("Caught string: %s\n", e);
    }
}

frame main() {
    call test_u64();
    call test_string();
    call printf("Primitive tests passed.\n");
}
