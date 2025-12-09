extern printf(format: string, ... ) ret int;

frame main() ret int {
    # 'print' is a built-in function in BPL standard library
    printf("Hello, World!\n");
    return 0;
}
