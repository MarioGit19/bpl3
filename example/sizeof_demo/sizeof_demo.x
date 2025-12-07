import malloc, free from "libc";
import [Console] from "std/io.x";

extern malloc(size: u64) ret *u8;
extern free(ptr: *u8);

frame main() ret i32 {
    # Demonstrate sizeof with different types
    call Console.log("sizeof(u8) = ", sizeof(u8));
    call Console.log("sizeof(u16) = ", sizeof(u16));
    call Console.log("sizeof(u32) = ", sizeof(u32));
    call Console.log("sizeof(u64) = ", sizeof(u64));
    call Console.log("sizeof(*u64) = ", sizeof(*u64));

    # Use sizeof to allocate array of 10 u32 elements
    local size: u64 = 10 * sizeof(u32);
    local arr: *u32 = cast<*u32>(call malloc(size));

    call Console.log("Allocated ", size, "lu bytes for 10 u32 elements");

    # Initialize and print
    arr[0] = 100;
    arr[9] = 900;
    call Console.log("arr[0] = ", arr[0], ", arr[9] = ", arr[9]);

    call free(cast<*u8>(arr));

    return 0;
}
