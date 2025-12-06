import sys_read, sys_write, SYS_READ, SYS_WRITE from "std/syscalls.x";
import print_str from "std/io.x";

frame main() {
    local buf: u8[100];
    # Zero out buffer
    local i: u64 = 0;
    loop {
        if i >= 100 {
            break;
        }
        buf[i] = 0;
        i = i + 1;
    }

    call print_str("Reading from stdin...\n");
    local bytes_read: u64 = call sys_read(call SYS_READ(), cast<*u8>(buf), 99);

    if bytes_read > 0 {
        call print_str("Read: ");
        call print_str(cast<*u8>(buf));
    } else {
        call print_str("Read nothing or error\n");
    }
}
