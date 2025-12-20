import [IO] from "std/io.bpl";

extern printf(fmt: *char, ...) ret i32;

frame main() {
    # Char (i8)
    local c: char = 'A';
    IO.printString(c.toString());
    local c2: i8 = 66;
    IO.printString(c2.toString());

    # UChar (u8)
    local uc: uchar = 67;
    IO.printString(uc.toString());
    local uc2: u8 = 68;
    IO.printString(uc2.toString());

    # Short (i16)
    local s: short = -12345;
    IO.printString(s.toString());
    local s2: i16 = 12345;
    IO.printString(s2.toString());

    # UShort (u16)
    local us: ushort = 60000;
    IO.printString(us.toString());
    printf("%d - Debug\n", cast<i32>(us));
    local us2: u16 = 65535;
    IO.printString(us2.toString());

    # UInt (u32)
    local ui: uint = cast<uint>(3000000000);
    IO.printString(ui.toString());
    printf("%lld - Debug\n", cast<i64>(ui));
    local ui2: u32 = cast<u32>(4000000000);
    IO.printString(ui2.toString());

    # ULong (u64)
    local ul: ulong = cast<ulong>(10000000000000000000);
    IO.printString(ul.toString());
    printf("%llu - Debug\n", ul);
    local ul2: u64 = cast<u64>(18446744073708551015);
    IO.printString(ul2.toString());
}
