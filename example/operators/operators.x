import [Console] from "std/io.x";

frame main() ret u8 {
    local a: u64 = 10;
    local b: u64 = 3;

    call Console.log("a = ", a, ", b = ", b);

    # Arithmetic
    call Console.log("a + b = ", a + b);
    call Console.log("a - b = ", a - b);
    call Console.log("a * b = ", a * b);
    call Console.log("a / b = ", a / b);
    call Console.log("a % b = ", a % b);

    # Bitwise
    call Console.log("a & b = ", a & b);
    call Console.log("a | b = ", a | b);
    call Console.log("a ^ b = ", a ^ b);
    call Console.log("a << 1 = ", a << 1);
    call Console.log("a >> 1 = ", a >> 1);

    # Comparison (returns 1 for true, 0 for false)
    call Console.log("a == b : ", a == b);
    call Console.log("a != b : ", a != b);
    call Console.log("a > b  : ", a > b);
    call Console.log("a < b  : ", a < b);

    # Logical (returns 1 for true, 0 for false)
    call Console.log("(a > 5) && (b < 5) : ", a > 5 && b < 5);
    call Console.log("(a < 5) || (b < 5) : ", a < 5 || b < 5);
    call Console.log("!a : ", !a);

    # Assignment operators
    local c: u64 = 10;
    c += 5;
    call Console.log("c += 5 -> ", c);
    c *= 2;
    call Console.log("c *= 2 -> ", c);

    return 0;
}
