extern printf(fmt: string, ...) ret int;

frame main() ret int {
    local x: int = foo();
    printf("Foo returned: %d\n", x);

    return 0;
}

frame foo() ret int {
    return 42;
}
