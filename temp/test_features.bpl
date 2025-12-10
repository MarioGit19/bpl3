extern printf(fmt: string, ...);

struct Point {
    x: int,
    y: int,

    frame sum(this: Point) ret int {
        return this.x + this.y;
    }
}

frame main() ret int {
    local p: Point;
    p.x = 10;
    p.y = 20;
    local s: int = p.sum();
    printf("Sum: %d\n", s);
    
    local arr: int[5];
    arr[0] = s;
    local val: int = arr[0];
    printf("Array value: %d\n", val);

    return 0;
}
