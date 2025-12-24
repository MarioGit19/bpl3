extern printf(fmt: string, ...) ret int;

frame main() ret int {
    printf("Variadic extern test\n");
    return 0;
}
