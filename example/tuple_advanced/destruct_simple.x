import [Console] from "std/io.x";

frame main() ret u8 {
    local t: (i64, i64) = (10, 20);
    local (a: i64, b: i64) = t;
    call Console.log("a=", a, ", b=", b);
    return 0;
}
