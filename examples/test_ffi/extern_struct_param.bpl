extern printf(fmt: string, ...) ret int;

struct Point {
    x: int,
    y: int,
}

extern process_point(p: Point) ret void;

frame main() ret int {
    local p: Point;
    p.x = 5;
    p.y = 10;
    process_point(p);
    printf("Struct param extern OK\n");
    return 0;
}
