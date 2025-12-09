extern printf(fmt: string, ...) ret int;

frame main() ret int {
    local arr: int[5];
    
    local i: int = 0;
    loop (i < 5) {
        arr[i] = i * 10;
        i = i + 1;
    }
    
    i = 0;
    loop (i < 5) {
        printf("arr[%d] = %d\n", i, arr[i]);
        i = i + 1;
    }
    
    return 0;
}
