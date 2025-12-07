import [Console] from "std/io.x";

frame main() ret i64 {
    local a: i64 = 10;
    local b: i32 = 20;
    local c: i16 = 30;
    local d: i8 = 40;

    call Console.log("a=", a, ", b=", b, ", c=", c, ", d=", d);
    return 0;
}
