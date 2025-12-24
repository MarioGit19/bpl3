extern printf(fmt: string, ...) ret int;
extern strlen(s: string) ret ulong;

frame main() ret int {
    printf("FFI test passed: %d\n", strlen("Hello FFI"));
    return 0;
}
