import [Console] from "std/io.x";

frame identity(x: u64) ret u64 {
    return x;
}

frame main() ret i32 {
    local y: u64 = call identity(42);
    call Console.log(y);
    return 0;
}
