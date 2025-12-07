import [Console] from "std/io.x";

frame main() ret u64 {
    local limit: u64 = 1000000000;
    local sum: u64 = 0;
    local i: u64 = 0;

    call Console.log("Summing numbers up to ", limit, "lu...");

    loop {
        if i >= limit {
            break;
        }
        # Simple arithmetic operations
        sum = sum + i;
        # Add some bitwise ops to make it slightly more complex
        i = i + 1;
    }

    call Console.log("Sum: ", sum);
    return 0;
}
