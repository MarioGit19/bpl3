import [Console] from "std/io.x";

frame test_bitwise_u64() {
    call Console.log("--- Bitwise u64 ---");
    local a: u64 = 0xDEADBEEFCAFEBABE;
    local b: u64 = 0x00000000FFFFFFFF;

    local and_res: u64 = a & b;
    call Console.print("AND: ");
    call Console.print_hex(a);
    call Console.print(" & ");
    call Console.print_hex(b);
    call Console.print(" = ");
    call Console.print_hex(and_res);
    call Console.println();

    local or_res: u64 = a | b;
    call Console.print("OR: ");
    call Console.print_hex(a);
    call Console.print(" | ");
    call Console.print_hex(b);
    call Console.print(" = ");
    call Console.print_hex(or_res);
    call Console.println();

    local xor_res: u64 = a ^ b;
    call Console.print("XOR: ");
    call Console.print_hex(a);
    call Console.print(" ^ ");
    call Console.print_hex(b);
    call Console.print(" = ");
    call Console.print_hex(xor_res);
    call Console.println();

    local not_res: u64 = ~b;
    call Console.print("NOT: ~");
    call Console.print_hex(b);
    call Console.print(" = ");
    call Console.print_hex(not_res);
    call Console.println();

    local shift_l: u64 = 1 << 4;
    call Console.log("SHL: 1 << 4 = ", shift_l);

    local shift_r: u64 = 16 >> 2;
    call Console.log("SHR: 16 >> 2 = ", shift_r);
}

frame test_bitwise_u32() {
    call Console.log("\n--- Bitwise u32 ---");
    local a: u32 = 0xAABBCCDD;
    local b: u32 = 0x0000FFFF;

    local and_res: u32 = a & b;
    call Console.print("AND: ");
    call Console.print_hex(cast<u64>(a));
    call Console.print(" & ");
    call Console.print_hex(cast<u64>(b));
    call Console.print(" = ");
    call Console.print_hex(cast<u64>(and_res));
    call Console.println();

    local not_res: u32 = ~a;
    call Console.print("NOT: ~");
    call Console.print_hex(cast<u64>(a));
    call Console.print(" = ");
    call Console.print_hex(cast<u64>(not_res));
    call Console.println();
}

frame test_bitwise_u8() {
    call Console.log("\n--- Bitwise u8 ---");
    local a: u8 = 0b10101010; # 0xAA
    local b: u8 = 0b00001111; # 0x0F

    local and_res: u8 = a & b;
    call Console.print("AND: ");
    call Console.print_hex(cast<u64>(a));
    call Console.print(" & ");
    call Console.print_hex(cast<u64>(b));
    call Console.print(" = ");
    call Console.print_hex(cast<u64>(and_res));
    call Console.println();

    local or_res: u8 = a | b;
    call Console.print("OR: ");
    call Console.print_hex(cast<u64>(a));
    call Console.print(" | ");
    call Console.print_hex(cast<u64>(b));
    call Console.print(" = ");
    call Console.print_hex(cast<u64>(or_res));
    call Console.println();
}

frame main() ret u64 {
    call test_bitwise_u64();
    call test_bitwise_u32();
    call test_bitwise_u8();
    return 0;
}
