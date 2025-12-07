import [Console] from "std/io.x";
extern printf(fmt: *i8, ...) ret i32;

frame main() ret i64 {
    local a: i64 = 10;
    local b: i64 = 20;
    local c: i64 = 30;

    call Console.log("a=", a, ", b=", b, ", c=", c);

    return 0;
}
