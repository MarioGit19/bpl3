import [Console] from "std/io.x";

frame main() ret u64 {
    call Console.log("--- Control Flow ---");

    local i: u64 = 0;
    loop {
        if i >= 3 {
            break;
        }
        call Console.log("Outer loop i=", i);

        local j: u64 = 0;
        loop {
            if j >= 3 {
                break;
            }

            if j == 1 {
                j += 1;
                continue;
            }

            call Console.log("  Inner loop j=", j);
            j += 1;
        }
        i += 1;
    }

    return 0;
}
