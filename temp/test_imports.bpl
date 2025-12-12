import * as std from "./std_dummy.bpl";
import * as other from "./std_dummy.bpl";
import hello, [Point] from "./std_dummy.bpl";
frame main() {
    std.hello();
    other.hello();
    hello();
}
