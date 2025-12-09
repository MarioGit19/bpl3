extern printf(fmt: string, ...) ret int;

struct Point {
    x: int,
    y: int,
}

frame main() ret int {
    printf("sizeof(int) = %d\n", sizeof(int));
    printf("sizeof(Point) = %d\n", sizeof(Point));
    
    local arr: int[10];
    printf("sizeof(arr) = %d\n", sizeof(arr));
    
    return 0;
}
