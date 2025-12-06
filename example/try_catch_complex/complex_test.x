import printf, exit from "libc";

struct ComplexError {
    id: u64,
    msg: *u8,
    data: u64[4],
}

struct BaseError {
    code: u32,
}

struct DerivedError: BaseError {
    details: *u8,
}

frame test_complex_struct() {
    call printf("Testing complex struct exception...\n");
    try {
        local err: ComplexError;
        err.id = 123;
        err.msg = "Complex error occurred";
        err.data[0] = 10;
        err.data[1] = 20;
        err.data[2] = 30;
        err.data[3] = 40;
        throw err;
    } catch (e: ComplexError) {
        call printf("Caught ComplexError: id=%lu, msg=%s, data=[%lu, %lu, %lu, %lu]\n", e.id, e.msg, e.data[0], e.data[1], e.data[2], e.data[3]);

        if e.id == 123 && e.data[3] == 40 {
            call printf("Complex struct verification passed.\n");
        } else {
            call printf("Complex struct verification failed.\n");
            call exit(1);
        }
    }
}

frame test_inheritance_fail() {
    call printf("Testing inheritance exception (expecting NO catch by base)...\n");
    try {
        try {
            local err: DerivedError;
            err.code = 404;
            err.details = "Not Found";
            throw err;
        } catch (e: BaseError) {
            call printf("Caught DerivedError as BaseError! (Unexpected for current impl)\n");
            call exit(1);
        }
    } catch (e: DerivedError) {
        call printf("Caught DerivedError explicitly. (Expected)\n");
    }
}

frame main() {
    call test_complex_struct();
    call test_inheritance_fail();
    call printf("All tests passed.\n");
}
