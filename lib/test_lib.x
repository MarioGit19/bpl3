import min_u64, max_u64, clamp_u64, pow_u64, abs_i64, gcd, lcm from "./math.x";
import strlen, strcpy, strcat, strcmp, streq, is_digit, is_alpha, to_upper, atoi from "./string.x";
import array_fill_u64, array_copy_u64, array_reverse_u64, array_find_u64, array_sum_u64 from "./array.x";
import get_rnd_u64 from "./random.x";
import println_u64, println_str, println from "./utils.x";
import malloc, free, printf from "libc";

frame main() ret u64 {
    call println_str("Testing Math...");
    call printf("min(10, 20): %lu\n", call min_u64(10, 20));
    call printf("max(10, 20): %lu\n", call max_u64(10, 20));
    call printf("clamp(5, 10, 20): %lu\n", call clamp_u64(5, 10, 20));
    call printf("clamp(25, 10, 20): %lu\n", call clamp_u64(25, 10, 20));
    call printf("clamp(15, 10, 20): %lu\n", call clamp_u64(15, 10, 20));
    call printf("pow(2, 3): %lu\n", call pow_u64(2, 3));
    call printf("gcd(12, 18): %lu\n", call gcd(12, 18));
    call printf("lcm(12, 18): %lu\n", call lcm(12, 18));

    call println_str("Testing String...");
    local s1: *u8 = "Hello";
    call printf("strlen('Hello'): %lu\n", call strlen(s1));

    local s2: *u8 = call malloc(20);
    call strcpy(s2, "World");
    call printf("strcpy: %s\n", s2);

    local s3: *u8 = call malloc(20);
    call strcpy(s3, "Hello");
    call strcat(s3, " World");
    call printf("strcat: %s\n", s3);

    call printf("streq('Hello', 'Hello'): %lu\n", call streq(s1, "Hello"));
    call printf("streq('Hello', 'World'): %lu\n", call streq(s1, "World"));

    local s4: u8[10] = "abc";
    call to_upper(s4);
    call printf("to_upper: %s\n", s4);

    call printf("atoi('123'): %ld\n", call atoi("123"));
    call printf("atoi('-456'): %ld\n", call atoi("-456"));

    call println_str("Testing Array...");
    local arr: u64[5];
    call array_fill_u64(arr, 5, 7);
    call printf("arr[0] (fill 7): %lu\n", arr[0]);
    call printf("arr[4] (fill 7): %lu\n", arr[4]);

    arr[0] = 1;
    arr[1] = 2;
    arr[2] = 3;
    arr[3] = 4;
    arr[4] = 5;
    call printf("sum(1..5): %lu\n", call array_sum_u64(arr, 5));

    call array_reverse_u64(arr, 5);
    call printf("arr[0] (reversed): %lu\n", arr[0]);

    call printf("find(3): %ld\n", call array_find_u64(arr, 5, 3));
    call printf("find(99): %ld\n", call array_find_u64(arr, 5, 99));

    call println_str("Testing Random...");
    local rnd: u64 = call get_rnd_u64(10, 20);
    if rnd >= 10 && rnd < 20 {
        call println_str("Random OK");
    }

    call free(s2);
    call free(s3);

    return 0;
}
