
extern printf(fmt: string, ...);

struct Point {
    x: int,
    y: int,

    frame new(x: int, y: int) ret Point {
        local p: Point;
        p.x = x;
        p.y = y;
        return p;
    }

    frame print(this: Point) {
        printf("Point(%d, %d)\n", this.x, this.y);
    }
}

frame main() {
    local p: Point = Point.new(10, 20);
    p.print();
}
