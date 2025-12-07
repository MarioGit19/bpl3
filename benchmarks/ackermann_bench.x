import [Console] from "std/io.x";

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
    call Console.log("Calculating Ackermann(", m, ", ", n, ")...");
    local res: u64 = call ackermann(m, n);
    call Console.log("Result: ", res);
    return 0;
}
