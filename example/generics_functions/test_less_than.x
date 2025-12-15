import [Console] from "std/io.x";

frame test() {
    local x: u64 = 1;
    if x < 5 {
        call Console.log("yes");
    }
}

frame main() ret i32 {
    call test();
    return 0;
}
