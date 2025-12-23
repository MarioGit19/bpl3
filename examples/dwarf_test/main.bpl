extern printf(fmt: string, ...);

frame main() ret int {
    printf("Hello, DWARF!\n");
    return 0;
}
