import [Console] from "std/io.x";

# Test compile-time cast function
frame main() ret u8 {
    # Test integer casts
    local x: u64 = 1000;
    local y: u8 = cast<u8>(x);
    call Console.log("u64 ", x, " cast to u8: ", y);

    # Test float casts
    local f: f64 = 3.14159;
    local i: u64 = cast<u64>(f);
    call Console.log("f64 ", f, " cast to u64: ", i);

    # Test pointer casts
    local a: u8 = 42;
    local ptr: *u8 = &a;
    local addr: u64 = cast<u64>(ptr);
    local back: *u8 = cast<*u8>(addr);
    call Console.log("Pointer ", ptr, " as u64: ", addr, ", back to pointer: ", back);

    # Test float precision casts
    local d: f64 = 1.23456789;
    local s: f32 = cast<f32>(d);
    call Console.log("f64 ", d, " cast to f32: ", s);

    return 0;
}
