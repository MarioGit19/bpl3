import [Console] from "std/io.x";
import [Array] from "std/array.x";
import [String] from "std/string.x";

frame main() {
    call Console.log("sizeof(String) = ", sizeof(String));
    call Console.log("sizeof(Array<String>) = ", sizeof(Array<String>));

    local arr: Array<String>;
    call Console.log("arr.data before init = ", arr.data);
    call Console.log("arr.length before init = ", arr.length);
    call Console.log("arr.capacity before init = ", arr.capacity);
}
