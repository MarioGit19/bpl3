import [Console] from "std/io.x";

frame main() ret u64 {
    local a: u64 = 10;
    local b: u64 = 20;

    call Console.log("Testing else if: ");
    call Console.log("a = ", a, ", b = ", b);

    if a > b {
        call Console.log("a > b");
    } else if a == b {
        call Console.log("a == b");
    } else {
        call Console.log("a < b");
    }

    a = 20;
    call Console.log("a = ", a, ", b = ", b);
    if a > b {
        call Console.log("a > b");
    } else if a == b {
        call Console.log("a == b");
    } else {
        call Console.log("a < b");
    }

    a = 30;
    call Console.log("a = ", a, ", b = ", b);
    if a > b {
        call Console.log("a > b");
    } else if a == b {
        call Console.log("a == b");
    } else {
        call Console.log("a < b");
    }

    # Nested else if
    local x: u64 = 5;
    if x == 1 {
        call Console.log("x is 1");
    } else if x == 2 {
        call Console.log("x is 2");
    } else if x == 3 {
        call Console.log("x is 3");
    } else if x == 4 {
        call Console.log("x is 4");
    } else if x == 5 {
        call Console.log("x is 5");
    } else {
        call Console.log("x is something else");
    }

    return 0;
}
