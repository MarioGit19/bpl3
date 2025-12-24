extern printf(fmt: string, ...) ret int;
extern malloc(size: ulong) ret string;
extern free(ptr: string) ret void;

frame main() ret int {
    printf("Multiple externs OK\n");
    return 0;
}
