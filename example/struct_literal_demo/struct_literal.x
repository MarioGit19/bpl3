import [Console] from "std/io.x";

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

    call Console.log("p1: (", p1.x, ", ", p1.y, ")");
    call Console.log("p2: (", p2.x, ", ", p2.y, ")");

    local r: Rect = {top_left: {x: 0, y: 0}, bottom_right: {100, 100}};

    call Console.log("Rect: [(", r.top_left.x, ", ", r.top_left.y, "), (", r.bottom_right.x, ", ", r.bottom_right.y, ")]");

    return 0;
}
