frame foo(a: int) ret int {
    if (a < 0) {
        return -1;
    } else if (a > 0) {
        return 1;
    } else if (a == 0) {
        return 0;
    }
}

frame main() ret int {
    local x: int = foo(3);

    return 0;
}
