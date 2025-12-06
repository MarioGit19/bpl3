import sys_write, SYS_WRITE from "syscalls.x";
import strlen from "string.x";

frame print_str(s: *u8) {
    local len: u64 = call strlen(s);
    call sys_write(call SYS_WRITE(), s, len);
}

frame print_char(c: u8) {
    local buf: u8[1];
    buf[0] = c;
    call sys_write(call SYS_WRITE(), cast<*u8>(buf), 1);
}

frame print_int(n: i64) {
    if n == 0 {
        call print_str("0");
        return;
    }

    if n < 0 {
        call print_str("-");
        n = 0 - n;
    }

    local buffer: u8[32];
    local i: u64 = 31;
    buffer[31] = 0;

    loop {
        if n == 0 {
            break;
        }
        i = i - 1;
        buffer[i] = cast<u8>(n % 10 + '0');
        n = n / 10;
    }

    call print_str(cast<*u8>(buffer) + i);
}

frame println() {
    call print_str("\n");
}

export print_str;
export print_char;
export print_int;
export println;
