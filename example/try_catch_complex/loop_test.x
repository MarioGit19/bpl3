import printf, exit from "libc";

frame main() {
    call printf("Testing throw from loop...\n");
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
        call printf("Caught from loop: %lu\n", e);
        if e == 5 {
            call printf("Loop throw verification passed.\n");
        } else {
            call printf("Loop throw verification failed.\n");
            call exit(1);
        }
    }
}
