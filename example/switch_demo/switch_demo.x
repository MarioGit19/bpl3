import [Console] from "std/io.x";

frame test_switch(val: u64) {
    switch val {
        case 1: {
            call Console.log("One");
        }
        case 2: {
            call Console.log("Two");
        }
        case 3: {
            call Console.log("Three");
        }
        case 10: {
            call Console.log("Ten");
        }
        default: {
            call Console.log("Other: ", val);
        }
    }
}

frame main() ret u64 {
    call test_switch(1);
    call test_switch(2);
    call test_switch(3);
    call test_switch(10);
    call test_switch(100);
    return 0;
}
