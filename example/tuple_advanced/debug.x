import [Console] from "std/io.x";

frame safe_divide(a: i64, b: i64) ret (i64, u8) {
    local zero: i64 = 0;
    if b == zero {
        local error_result: (i64, u8) = (zero, cast<u8>(1));
        return error_result;
    }
    local success_result: (i64, u8) = (a // b, cast<u8>(0));
    return success_result;
}

frame main() ret u8 {
    call Console.log("Test: Safe division");

    local div_result: (i64, u8) = call safe_divide(20, 4);
    call Console.log("Result tuple created");

    local (quotient: i64, err: u8) = div_result;
    call Console.log("Destructured");

    call Console.log("Quotient: ", quotient, ", Error: ", err);

    return cast<u8>(0);
}
