import [Console] from "std/io.x";

struct Test<A, B> {
    a: A,
    b: B,
}

struct Packed<A, B> {
    a: A,
    b: B,
}

frame main() ret u8 {
    # Case 1: Test<u8, u64> -> Should have padding
    # u8 is 1 byte, u64 is 8 bytes. Alignment of u64 is 8.
    # So 'a' at 0. Padding 7 bytes. 'b' at 8. Size 16.
    local t1: Test<u8, u64>;
    t1.a = 1;
    t1.b = 2;

    call Console.log("Test<u8, u64>: ");
    call Console.log("Address of t1: ", &t1);
    call Console.log("Address and value of t1.a: ", &t1.a, " ", t1.a);
    call Console.log("Address and value of t1.b: ", &t1.b, " ", t1.b);

    # Case 2: Test<u64, u8> -> Should have padding at end
    # u64 at 0. u8 at 8. Size 16 (aligned to 8).
    local t2: Test<u64, u8>;
    t2.a = 3;
    t2.b = 4;

    call Console.log("Test<u64, u8>: ");
    call Console.log("Address of t2: ", &t2);
    call Console.log("Address and value of t2.a: ", &t2.a, " ", t2.a);
    call Console.log("Address and value of t2.b: ", &t2.b, " ", t2.b);

    # Case 3: Test<u8, u8> -> Packed
    # u8 at 0. u8 at 1. Size 2.
    local t3: Test<u8, Packed<u64, u8>>;
    t3.a = 5;
    t3.b.a = 6;
    t3.b.b = 7;

    call Console.log("Test<u8, Packed<u64, u8>>: ");
    call Console.log("Address of t3: ", &t3);
    call Console.log("Address and value of t3.a: ", &t3.a, " ", t3.a);
    call Console.log("Address and value of t3.b.a: ", &t3.b.a, " ", t3.b.a);
    call Console.log("Address and value of t3.b.b: ", &t3.b.b, " ", t3.b.b);

    return 0;
}
