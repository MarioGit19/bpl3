import [Console] from "std/io.x";

frame get_rnd_u64() ret u64 {
    local rnd: u64 = 0;
    asm {
        rdrand rax;
        mov [(rnd)], rax;
    }
    return rnd;
}

frame main() ret u8 {
    local a: u64 = 100;
    local b: u64 = 20;
    local result: u64 = 0;

    call Console.log("Before ASM: a=", a, ", b=", b, ", result=", result);

    asm {
        mov rax, [(a)] ; Load 'a' into rax
        add rax, [(b)] ; Add 'b' to rax
        mov [(result)], rax ; Store result in 'result'
    }

    call Console.log("After ASM (a + b): result=", result);

    # Another example: direct syscall using asm
    # We will write "Hi\n" to stdout (fd 1)
    # This bypasses the standard library 'print' function

    local msg: *u8 = "Hi from ASM!\n";
    local len: u64 = 13;

    asm {
        mov rax, 1          ; syscall number for write
        mov rdi, 1          ; file descriptor 1 (stdout)
        mov rsi, [(msg)]      ; buffer address
        mov rdx, [(len)]      ; length
        syscall
    }

    # Another example: calling get_rnd_u64 from asm
    local random_value: u64 = 0;
    random_value = call get_rnd_u64();
    call Console.log("Random value from get_rnd_u64: ", random_value);

    return 0;
}
