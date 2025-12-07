import [Console] from "std/io.x";

frame main() ret u64 {
    call Console.log("--- Casting Tests ---");

    # Float to Int
    local f: f64 = 123.456;
    local i: u64 = f;
    call Console.log("f64 to u64: ", f, " -> ", i);

    # Int to Float
    local j: u64 = 987;
    local g: f64 = j;
    call Console.log("u64 to f64: ", j, " -> ", g);

    # f32 to f64
    local small_f: f32 = 3.14;
    local big_f: f64 = small_f;
    call Console.log("f32 to f64: ", small_f, " -> ", big_f);

    # f64 to f32
    local big_f2: f64 = 6.28;
    local small_f2: f32 = big_f2;
    call Console.log("f64 to f32: ", big_f2, " -> ", small_f2);

    # Truncation (u64 -> u8)
    local big_int: u64 = 0x1234567890ABCDEF;
    local small_int: u8 = cast<u8>(big_int);
    call Console.print_str("u64 to u8 (trunc): ");
    call Console.print_hex(big_int);
    call Console.print_str(" -> ");
    call Console.print_hex(small_int);
    call Console.print_str("\n");
    return 0;
}
