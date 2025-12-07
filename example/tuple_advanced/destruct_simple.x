import printf from "libc";

frame main() ret u8 {
    local t: (i64, i64) = (10, 20);
    local (a: i64, b: i64) = t;
    call printf("a=%ld, b=%ld\n", a, b);
    return 0;
}
