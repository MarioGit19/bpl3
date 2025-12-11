import [Math] from "./math.x";
import [String] from "./string.x";
import [Array] from "./array.x";
import println_u64, println_str, println from "./utils.x";
import malloc, free from "libc";
import [Console] from "std/io.x";

frame main() ret u64 {
    println_str("Testing Math...");
    Console.log("min(10, 20): ", Math.min(10, 20), "u");
    Console.log("max(10, 20): ", Math.max(10, 20), "u");
    Console.log("clamp(5, 10, 20): ", Math.clamp(5, 10, 20), "u");
    Console.log("clamp(25, 10, 20): ", Math.clamp(25, 10, 20), "u");
    Console.log("clamp(15, 10, 20): ", Math.clamp(15, 10, 20), "u");
    Console.log("pow(2, 3): ", Math.pow(2, 3), "u");
    Console.log("gcd(12, 18): ", Math.gcd(12, 18), "u");
    Console.log("lcm(12, 18): ", Math.lcm(12, 18), "u");

    println_str("Testing String...");
    local s1: *u8 = "Hello";
    Console.log("strlen('Hello'): ", String.strlen(s1), "u");

    local s2: *u8 = malloc(20);
    String.strcpy(s2, "World");
    Console.log("strcpy: ", s2);

    local s3: *u8 = malloc(20);
    String.strcpy(s3, "Hello");
    String.strcat(s3, " World");
    Console.log("strcat: ", s3);

    Console.log("streq('Hello', 'Hello'): ", String.streq(s1, "Hello"), "u");
    Console.log("streq('Hello', 'World'): ", String.streq(s1, "World"), "u");

    local s4: u8[10] = "abc";
    String.to_upper(s4);
    Console.log("to_upper: ", s4);

    Console.log("atoi('123'): ", String.atoi("123"));
    Console.log("atoi('-456'): ", String.atoi("-456"));

    println_str("Testing Array...");
    local arr: Array<u64> = Array<u64>.empty(5);

    # Test push
    arr.push(10);
    arr.push(20);
    arr.push(30);

    Console.log("arr len: ", arr.len(), "u");
    Console.log("arr[0]: ", arr.get(0), "u");
    Console.log("arr[2]: ", arr.get(2), "u");

    # Test set
    arr.set(1, 99);
    Console.log("arr[1] after set: ", arr.get(1), "u");

    # Test pop
    local val: u64 = arr.pop();
    Console.log("popped: ", val, "u");
    Console.log("arr len after pop: ", arr.len(), "u");

    arr.free();

    println_str("Testing Random...");
    local rnd: u64 = Math.random(10, 20);
    Console.log("Random: ", rnd, "u");
    if rnd >= 10 && rnd < 20 {
        println_str("Random OK");
    } else {
        throw "Random out of range";
    }

    free(s2);
    free(s3);

    return 0;
}
