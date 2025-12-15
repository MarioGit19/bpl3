frame square(n: u64) ret u64 {
    return n * n;
}
frame add_u64(a: u64, b: u64) ret u64 {
    return a + b;
}
export square;
export add_u64;
