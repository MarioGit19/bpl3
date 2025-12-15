import scanf from "libc";
import [Console] from "std/io.x";

frame get_input() ret u64 {
    local n: u64;
    call Console.print("Enter the number: ");
    call scanf("%llu", &n);
    return n;
}

frame collatz() {
    local n: u64 = call get_input();
    local c: u64 = 0;

    call Console.log("[0]: ", n);

    loop {
        if n < 2 {
            break;
        }

        if n % 2 == 0 {
            n /= 2;
        } else {
            n = n * 3 + 1;
        }

        c += 1;
        call Console.log("[", c, "]: ", n);
    }

    call Console.log("Found solution in ", c, " steps");
}

frame main() ret u8 {
    call collatz();
    return 0;
}
