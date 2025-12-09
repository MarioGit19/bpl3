extern printf(fmt: string, ...) ret int;

struct Point {
    x: int,
    y: int,
}

frame main() ret int {
    local p: Point = Point { x: 10, y: 20 };
    printf("p.x = %d, p.y = %d\n", p.x, p.y);
    
    local p2: Point = Point { x: p.x + 5, y: p.y * 5 };
    printf("p2.x = %d, p2.y = %d\n", p2.x, p2.y);
    
    return 0;
}
