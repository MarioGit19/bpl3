import [Array] from "std/array.x";
import [String] from "std/string.x";

frame main() {
    local a: Array<Array<String>>;
    a.length = 0;
    local inner: Array<String>;
    inner.length = 0;
    call a.push(inner);
}
