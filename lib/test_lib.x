import [Math] from "./math.x";
import [String] from "./string.x";
import [Array] from "./array.x";
import println_u64, println_str, println from "./utils.x";
import malloc, free from "libc";
import [Console] from "std/io.x";

frame main() ret u64 {
    call println_str("Testing Math...");
    call Console.log("min(10, 20): ", call Math.min(10, 20), "u");
    call Console.log("max(10, 20): ", call Math.max(10, 20), "u");
    call Console.log("clamp(5, 10, 20): ", call Math.clamp(5, 10, 20), "u");
    call Console.log("clamp(25, 10, 20): ", call Math.clamp(25, 10, 20), "u");
    call Console.log("clamp(15, 10, 20): ", call Math.clamp(15, 10, 20), "u");
    call Console.log("pow(2, 3): ", call Math.pow(2, 3), "u");
    call Console.log("gcd(12, 18): ", call Math.gcd(12, 18), "u");
    call Console.log("lcm(12, 18): ", call Math.lcm(12, 18), "u");

    call println_str("Testing String...");
    local s1: *u8 = "Hello";
    call Console.log("strlen('Hello'): ", call String.strlen(s1), "u");

    local s2: *u8 = call malloc(20);
    call String.strcpy(s2, "World");
    call Console.log("strcpy: ", s2);

    local s3: *u8 = call malloc(20);
    call String.strcpy(s3, "Hello");
    call String.strcat(s3, " World");
    call Console.log("strcat: ", s3);

    call Console.log("streq('Hello', 'Hello'): ", call String.streq(s1, "Hello"), "u");
    call Console.log("streq('Hello', 'World'): ", call String.streq(s1, "World"), "u");

    local s4: u8[10] = "abc";
    call String.to_upper(s4);
    call Console.log("to_upper: ", s4);

    call Console.log("atoi('123'): ", call String.atoi("123"));
    call Console.log("atoi('-456'): ", call String.atoi("-456"));

    call println_str("Testing Array...");
    local arr: Array<u64> = call Array<u64>.empty(5);

    # Test push
    call arr.push(10);
    call arr.push(20);
    call arr.push(30);

    call Console.log("arr len: ", call arr.len(), "u");
    call Console.log("arr[0]: ", call arr.get(0), "u");
    call Console.log("arr[2]: ", call arr.get(2), "u");

    # Test set
    call arr.set(1, 99);
    call Console.log("arr[1] after set: ", call arr.get(1), "u");

    # Test pop
    local val: u64 = call arr.pop();
    call Console.log("popped: ", val, "u");
    call Console.log("arr len after pop: ", call arr.len(), "u");

    call arr.free();

    call println_str("Testing Random...");
    local rnd: u64 = call Math.random(10, 20);
    call Console.log("Random: ", rnd, "u");
    if rnd >= 10 && rnd < 20 {
        call println_str("Random OK");
    } else {
        throw "Random out of range";
    }

    call free(s2);
    call free(s3);

    return 0;
}
