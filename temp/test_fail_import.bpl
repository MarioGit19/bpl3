# This should fail: trying to import non-exported item
import [Car] from "./module_a.bpl";

frame main() {
    local c: Car;
}
