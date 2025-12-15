# Demo test for Array and String features
import [Console] from "std/io.x";
import [Array] from "std/array.x";
import [String] from "std/string.x";

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

    # String demo
    local s1: String = call String.new("Hello, ");
    local s2: String = call String.new("World!");
    local slice: String;

    call s1.concat(&s2);
    call Console.log("Concat: ", s1.buffer);
    call s1.slice(7, 12, &slice);
    call Console.log("Slice: ", slice.buffer);
    call Console.log("Length: ", call s1.len());

    call s1.free();
    call s2.free();
    call slice.free();
}
