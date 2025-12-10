extern printf(fmt: string, ...) ret int;
extern malloc(size: int) ret *char;
extern free(ptr: *char) ret void;

frame main() ret int {
    local x: int = 10;
    local ptr: *int = &x;
    
    printf("x = %d\n", x);
    printf("*ptr = %d\n", *ptr);
    
    *ptr = 20;
    printf("x after *ptr=20: %d\n", x);
    
    // Dynamic allocation
    local dyn: *int = cast<*int>(malloc(8));
    *dyn = 123;
    printf("*dyn = %d\n", *dyn);
    
    // Pointer arithmetic
    local arr: *int = cast<*int>(malloc(16));
    *arr = 1;
    *(arr + 1) = 2;
    
    printf("arr[0] = %d, arr[1] = %d\n", *arr, *(arr + 1));
    
    return 0;
}
