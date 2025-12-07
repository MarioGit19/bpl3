import malloc, realloc, free, cast from "libc";
import [Console] from "std/io.x";

extern malloc(size: u64) ret *u8;
extern realloc(ptr: *u8, size: u64) ret *u8;
extern free(ptr: *u8);

frame main() ret i32 {
    # Test dynamic array with manual malloc/realloc
    local data: *u64 = cast<*u64>(call malloc(8 * sizeof(u64)));
    local length: u64 = 0;
    local capacity: u64 = 8;

    # Add elements
    data[0] = 10;
    data[1] = 20;
    data[2] = 30;
    data[3] = 40;
    data[4] = 50;
    length = 5;

    call Console.log("Array length: ", length);
    call Console.log("Array capacity: ", capacity);
    call Console.log("First element: ", data[0]);
    call Console.log("Last element: ", data[length - 1]);

    # Grow array
    local i: u64 = 5;
    loop {
        if i >= 20 {
            break;
        }
        if length >= capacity {
            capacity = capacity * 2;
            data = cast<*u64>(call realloc(cast<*u8>(data), capacity * sizeof(u64)));
        }
        data[length] = i * 10;
        length = length + 1;
        i = i + 1;
    }

    call Console.log("After growth - length: ", length, "lu, capacity: ", capacity);
    call Console.log("Element at index 10: ", data[10]);
    call Console.log("Element at index 15: ", data[15]);

    # Cleanup
    call free(cast<*u8>(data));

    return 0;
}
