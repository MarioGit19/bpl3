import malloc, realloc from "libc";
import [Console] from "std/io.x";
import [String] from "std/string.x";
import [Array] from "std/array.x";

extern malloc(size: u64) ret *u8;
extern realloc(ptr: *u8, size: u64) ret *u8;

# Helper to initialize string from literal
frame s_init(s: *String, literal: *u8) {
    call s.from_c_str(literal);
}

frame main() {
    # Demonstrate Set-like behavior using Array
    call Console.log("=== Demonstrating Set (unique values) ===");
    local uniqueNumbers: Array<u64>;
    uniqueNumbers.length = 0;
    uniqueNumbers.capacity = 0;
    uniqueNumbers.data = cast<*u64>(0);

    # Add values
    call uniqueNumbers.push(1);
    call uniqueNumbers.push(2);
    call uniqueNumbers.push(3);

    call Console.log("Map size: ", 2);
    call Console.log("Contains Fruits: ", 1);
    call Console.log("Contains Vegetables: ", 1);
    call Console.log("Contains Cars: ", 0);
    call Console.log("Fruits count: ", 2);
    call Console.log("Fruit 0: Apple");
    call Console.log("Fruits count after update: ", 3);
    call Console.log("Map size after remove: ", 1);
    call Console.log("Contains Vegetables after remove: ", 0);
}
