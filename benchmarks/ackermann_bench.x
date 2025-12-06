import printf from "libc";

frame ackermann(m: u64, n: u64) ret u64 {
    if m == 0 {
        return n + 1;
    }
    if n == 0 {
        return call ackermann(m - 1, 1);
    }
    return call ackermann(m - 1, call ackermann(m, n - 1));
}

frame main() ret u64 {
    local m: u64 = 3;
    local n: u64 = 11;
    call printf("Calculating Ackermann(%d, %d)...\n", m, n);
    local res: u64 = call ackermann(m, n);
    call printf("Result: %llu\n", res);
    return 0;
}
