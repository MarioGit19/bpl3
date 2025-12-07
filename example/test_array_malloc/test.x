# Test that Array.x's malloc import works without re-importing in main
import [Console] from "std/io.x";
import [Array] from "std/array.x";

extern printf(format: *u8, ...);

frame main() ret i32 {
    local arr: Array<u64>;
    call arr.push(42);
    call arr.push(99);

    call Console.log("Array length: ", call arr.len());
    call Console.log("First: ", call arr.get(0));
    call Console.log("Second: ", call arr.get(1));

    return 0;
}
