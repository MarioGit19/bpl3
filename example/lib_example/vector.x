import [Point] from "./types.x";
import square, add_u64 from "./math.x";
import printf from "libc";

frame magnitudeSquared(p: Point) ret u64 {
    call printf("%d, %d\n", p.x, p.y);
    return call add_u64(call square(p.x), call square(p.y));
}
export magnitudeSquared;
