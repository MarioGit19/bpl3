import [IO] from "std/io.bpl";

struct Point {
    x: int,
    y: int,
}

frame check<T>(val: T) {
    if (match<int>(val)) {
        IO.print("Value is an int\n");
    } else {
        if (match<float>(val)) {
            IO.print("Value is a float\n");
        } else {
            if (match<Point>(val)) {
                IO.print("Value is a Point\n");
            } else {
                IO.print("Value is something else\n");
            }
        }
    }
}

frame main() {
    check<int>(42);
    check<float>(3.14);
    check<bool>(true);
    check<Point>(Point { x: 1, y: 2 });
}
