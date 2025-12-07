import exit from "libc";
import [Console] from "std/io.x";

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
    call Console.log("Testing complex struct exception...");
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
        call Console.log("Caught ComplexError: id=", e.id, ", msg=", e.msg, ", data=[", e.data[0], ", ", e.data[1], ", ", e.data[2], ", ", e.data[3], "]");

        if e.id == 123 && e.data[3] == 40 {
            call Console.log("Complex struct verification passed.");
        } else {
            call Console.log("Complex struct verification failed.");
            call exit(1);
        }
    }
}

frame test_inheritance_fail() {
    call Console.log("Testing inheritance exception (expecting NO catch by base)...");
    try {
        try {
            local err: DerivedError;
            err.code = 404;
            err.details = "Not Found";
            throw err;
        } catch (e: BaseError) {
            call Console.log("Caught DerivedError as BaseError! (Unexpected for current impl)");
            call exit(1);
        }
    } catch (e: DerivedError) {
        call Console.log("Caught DerivedError explicitly. (Expected)");
    }
}

frame main() {
    call test_complex_struct();
    call test_inheritance_fail();
    call Console.log("All tests passed.");
}
