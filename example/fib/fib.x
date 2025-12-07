import scanf from "libc";
import [Console] from "std/io.x";

frame get_input() ret u64 {
    local num: u64 = 0;
    call Console.print("Enter a number: ");
    call scanf("%llu", &num);
    return num;
}

# Recursive implementation (Slow, O(2^n))
frame fib_recursive(n: u64) ret u64 {
    if n <= 1 && n > -1 {
        return n;
    }
    return call fib_recursive(n - 1) + call fib_recursive(n - 2);
}

# Tail-recursive implementation (Fast, O(n), TCO optimized)
frame fib_tail(n: u64, a: u64, b: u64) ret u64 {
    if n == 0 {
        return a;
    }
    if n == 1 {
        return b;
    }
    return call fib_tail(n - 1, b, a + b);
}

frame fib_recursive_optimized(n: u64) ret u64 {
    return call fib_tail(n, 0, 1);
}

# Iterative implementation
frame fib_iterative(n: u64) {
    local a: u64 = 1;
    local b: u64 = 0;
    local temp: u64 = 0;
    local i: u64 = 0;

    call Console.log("Iterative Sequence: ");
    loop {
        if i >= n {
            break;
        }
        temp = a + b;
        a = b;
        b = temp;
        i = i + 1;

        call Console.print("[", i, "]: ");
        call Console.print_u64(cast<u64>(b));
        call Console.print_str("\n");
    }
}

frame main() ret u8 {
    local n: u64 = call get_input();

    call fib_iterative(n);

    n = call get_input();

    call Console.log("\nRecursive Calculation for ", n, "-th number: ");
    local res: u64 = call fib_recursive_optimized(n); # 0-indexed
    call Console.log("Result: ", res);

    return 0;
}
