frame test_unused() {
    local x: u64 = 10;
    local y: u64 = 20;
    local z: u64 = y + 5;
}

frame main() ret int {
    test_unused();
    return 0;
}
