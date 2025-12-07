import [Console] from "std/io.x";
extern printf(fmt: *u8, ...);

frame main() ret i64 {
    local a: i64 = 10;
    asm {
        mov rbx, rax
    }

    local b: i64 = 20;

    call Console.log("a=", a, ", b=", b);
    return 0;
}
