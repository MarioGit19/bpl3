import [Console] from "std/io.x";

frame test_tuple() ret (i64, u8) {
    local a: i64 = 20;
    local b: i64 = 4;
    local result: (i64, u8) = (a // b, cast<u8>(1));
    return result;
}

frame main() ret u8 {
    local t: (i64, u8) = call test_tuple();
    local code_u8: u8 = t.1;
    local code_i64: i64 = cast<i64>(code_u8);
    call Console.log("Value: ", t.0, ", Code: ", code_i64);
    return cast<u8>(0);
}
