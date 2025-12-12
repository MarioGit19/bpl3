import sys_write, SYS_WRITE from "syscalls.x";
import [String] from "./string.x";

struct Console {

    frame print_str(s: *u8) {
        local len: u64 = String.strlen(s);
        sys_write(SYS_WRITE(), s, len);
    }

    frame print_char(c: u8) {
        local buf: u8[1];
        buf[0] = c;
        sys_write(SYS_WRITE(), cast<*u8>(buf), 1);
    }

    frame print_u64(n: u64) {
        if n == 0 {
            Console.print_str("0");
            return;
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
            n = (n / 10);
        }

        Console.print_str(cast<*u8>(buffer) + i);
    }

    frame print_int(n: i64) {
        if n == 0 {
            Console.print_str("0");
            return;
        }

        if n < 0 {
            Console.print_str("-");
            n = 0 - n;
        }

        Console.print_u64(cast<u64>(n));
    }

    frame print_bool(b: u8) {
        if b {
            Console.print_str("true");
        } else {
            Console.print_str("false");
        }
    }

    frame print_f64(f: f64) {
        local ptr: *f64 = &f;
        local u_ptr: *u64 = cast<*u64>(ptr);
        local bits: u64 = *u_ptr;

        local exp: u64 = bits >> 52 & 2047;
        local mantissa: u64 = bits & 4503599627370495; # 0xFFFFFFFFFFFFF

        if exp == 2047 {
            if mantissa == 0 {
                if bits >> 63 {
                    Console.print_str("-inf");
                } else {
                    Console.print_str("inf");
                }
            } else {
                Console.print_str("nan");
            }
            return;
        }

        if bits >> 63 {
            Console.print_str("-");
            f = 0.0 - f;
        }

        local PRECISION: f64 = 100000000000000000.0;
        local whole: u64 = cast<u64>(f);
        local frac: f64 = f - cast<f64>(whole);
        local frac_int: u64 = cast<u64>(frac * PRECISION + 0.5);

        if frac_int >= cast<u64>(PRECISION) {
            whole = whole + 1;
            frac_int = 0;
        }

        Console.print_u64(whole);
        Console.print_str(".");

        local threshold: u64 = 10000000000000000;
        loop {
            if threshold == 1 {
                break;
            }
            if frac_int < threshold {
                Console.print_str("0");
            }
            threshold = threshold / 10;
        }

        Console.print_u64(frac_int);
    }

    frame print_hex(n: u64) {
        if n == 0 {
            Console.print_str("0");
            return;
        }
        local buffer: u8[32];
        local i: u64 = 31;
        buffer[31] = 0;
        local hex: *u8 = "0123456789abcdef";
        loop {
            if n == 0 {
                break;
            }
            i = i - 1;
            buffer[i] = hex[n % 16];
            n = (n / 16);
        }
        Console.print_str(cast<*u8>(buffer) + i);
    }

    frame print_ptr(p: *u8) {
        Console.print_str("0x");
        local n: u64 = cast<u64>(p);
        if n == 0 {
            Console.print_str("0");
            return;
        }

        local buffer: u8[32];
        local i: u64 = 31;
        buffer[31] = 0;
        local hex: *u8 = "0123456789abcdef";

        loop {
            if n == 0 {
                break;
            }
            i = i - 1;
            buffer[i] = hex[n % 16];
            n = n / 16;
        }
        Console.print_str(cast<*u8>(buffer) + i);
    }

    frame println() {
        Console.print_str("\n");
    }

    frame log(...:*u8) {
        # jus a placeholder
        # this method is implemented in compiler itself
    }

    frame print(...:*u8) {
        # jus a placeholder
        # this method is implemented in compiler itself
    }
}

export [Console];
