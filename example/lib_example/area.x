import [Rectangle] from "./shapes.x";

frame rectArea(r: Rectangle) ret u64 {
    return *r.width * *(r.width + 8);
}
export rectArea;
