import multiply, [Point] from "./lib.x";
import [Console] from "std/io.x";

extern printf(s: *u8, ...);

frame main() ret u8 {
    local p: Point = {3, 4};

    local res: u32 = call multiply(p.x, p.y);
    call Console.log(res);
    return 0;
}
