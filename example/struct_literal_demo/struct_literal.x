import printf from "libc";

struct Point {
    x: i32,
    y: i32,
}

struct Rect {
    top_left: Point,
    bottom_right: Point,
}

frame main() ret i32 {
    local p1: Point = {x: 10, y: 20};
    local p2: Point = {30, 40};

    call printf("p1: (%d, %d)\n", p1.x, p1.y);
    call printf("p2: (%d, %d)\n", p2.x, p2.y);

    local r: Rect = {top_left: {x: 0, y: 0}, bottom_right: {100, 100}};

    call printf("Rect: [(%d, %d), (%d, %d)]\n", r.top_left.x, r.top_left.y, r.bottom_right.x, r.bottom_right.y);

    return 0;
}
