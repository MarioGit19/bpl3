extern printf(fmt: string, ...);
extern malloc(size: int) ret *void;
extern memset(ptr: *void, value: int, size: int) ret *void;
extern free(ptr: *void);

frame main() ret int {
    # Allocate 12 bytes and zero them
    local ptr: *void = malloc(12);
    memset(ptr, 0, 12);

    # Cast to char* and test __bpl_mem_is_zero
    local bytes: *int = cast<*int>(ptr);
    local result: int;

    printf("Testing zeroed memory...\n");

    free(ptr);
    return 0;
}
