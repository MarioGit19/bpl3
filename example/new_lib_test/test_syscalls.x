import sys_write, sys_exit, SYS_WRITE from "std/syscalls.x";
import print_str, print_int, println from "std/io.x";

frame main() {
    call print_str("--- Testing Syscalls ---\n");

    # Test sys_write directly
    local msg: *u8 = "Direct sys_write test\n";
    call sys_write(call SYS_WRITE(), msg, 22);

    call print_str("Exiting with code 42...\n");
    call sys_exit(42);
}
