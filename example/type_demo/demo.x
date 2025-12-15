import [Console] from "std/io.x";

frame add(a: i32, b: i32) ret i32 {
    return a + b;
}

frame main() ret i32 {
    local x: i32 = 10;
    local y: i32 = 20;
    local result: i32 = call add(x, y);

    if result > 25 {
        call Console.println("Result is greater than 25");
    } else {
        call Console.println("Result is 25 or less");
    }

    return result;
}
