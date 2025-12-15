import [Console] from "std/io.x";
import [Array] from "std/array.x";

frame main() {
    # Array demo
    local arr: Array<u64>;
    arr.length = 0;
    call arr.push(10);
    call arr.push(20);
    call arr.push(30);
    call Console.log("Array length: ", call arr.len());
    call Console.log("Array pop: ", call arr.pop());
    call Console.log("Array length after pop: ", call arr.len());
}
