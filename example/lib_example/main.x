import [Point] from "./types.x";
import [Rectangle] from "./shapes.x";
import magnitudeSquared from "./vector.x";
import rectArea from "./area.x";
import logNumber, logGlobal from "./printer.x";
import printf from "libc";

frame main() ret u8 {
    local p: Point;
    p.x = 5;
    p.y = 4;
    local mag: u64 = call magnitudeSquared(p);
    call logNumber(mag);

    local r: Rectangle;
    r.width = 10;
    r.height = 20;
    local area: u64 = call rectArea(r);
    call logNumber(area);

    call logGlobal();
    return 0;
}
