frame foo() ret int {
    if (true) {
        return 1;
    } else {
        return 0;
    }
}

frame main() ret void {
    local x: int = foo();
}
