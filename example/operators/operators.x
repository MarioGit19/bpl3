import printf from "libc";

frame main() ret u8 {
    local a: u64 = 10;
    local b: u64 = 3;

    call printf("a = %d, b = %d\n", a, b);

    # Arithmetic
    call printf("a + b = %d\n", a + b);
    call printf("a - b = %d\n", a - b);
    call printf("a * b = %d\n", a * b);
    call printf("a / b = %d\n", a / b);
    call printf("a %% b = %d\n", a % b);

    # Bitwise
    call printf("a & b = %d\n", a & b);
    call printf("a | b = %d\n", a | b);
    call printf("a ^ b = %d\n", a ^ b);
    call printf("a << 1 = %d\n", a << 1);
    call printf("a >> 1 = %d\n", a >> 1);

    # Comparison (returns 1 for true, 0 for false)
    call printf("a == b : %d\n", a == b);
    call printf("a != b : %d\n", a != b);
    call printf("a > b  : %d\n", a > b);
    call printf("a < b  : %d\n", a < b);

    # Logical (returns 1 for true, 0 for false)
    call printf("(a > 5) && (b < 5) : %d\n", (a > 5) && (b < 5));
    call printf("(a < 5) || (b < 5) : %d\n", (a < 5) || (b < 5));
    call printf("!a : %d\n", !a);

    # Assignment operators
    local c: u64 = 10;
    c += 5;
    call printf("c += 5 -> %d\n", c);
    c *= 2;
    call printf("c *= 2 -> %d\n", c);
    
    return 0;
}
