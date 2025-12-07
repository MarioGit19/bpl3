import malloc, free, strcpy, strcat, strcmp, strlen from "libc";
import [Console] from "std/io.x";

extern malloc(size: i32) ret *u8;

frame to_upper(str: *u8) {
    local i: u64 = 0;
    loop {
        if str[i] == 0 {
            break;
        }
        if str[i] >= 'a' && str[i] <= 'z' {
            str[i] = str[i] - 32;
        }
        i = i + 1;
    }
}

frame main() ret u64 {
    call Console.log("=== String Handling Demo ===");

    # 1. String Literal (Pointer to .rodata)
    # This is the most common way. The string data lives in the read-only data section.
    # 'str_ro' is a pointer (*u8) to that location.
    local str_ro: *u8 = "Hello, Read-Only Data!";
    call Console.log("[1] RO String: ", str_ro);

    # 2. Stack String (Initialized with Literal)
    # This allocates 64 bytes on the stack and copies "Hello, Stack!" into it.
    # This is mutable!
    local stack_str: u8[64] = "Hello, Stack!";
    call Console.log("[2] Stack String: ", stack_str);

    # We can modify it:
    stack_str[0] = 'h'; # Lowercase 'h'
    stack_str[12] = '?';
    call Console.log("[2] Modified:     ", stack_str);

    # 3. Stack Buffer (Manually populated)
    local buffer: u8[32];
    call strcpy(buffer, "Manual Copy");
    call Console.log("[3] Manual Copy:  ", buffer);

    # 4. Heap String (Dynamic)
    local heap_str: *u8 = call malloc(128);
    call strcpy(heap_str, "Hello, Heap!");
    call Console.log("[4] Heap String:  ", heap_str);

    # Modify heap string
    heap_str[7] = 'h';
    call Console.log("[4] Modified:     ", heap_str);

    call free(heap_str);

    # 5. Concatenation (using strcat)
    local cat_buf: *u8 = call malloc(128);
    # Initialize first!
    call strcpy(cat_buf, "Part 1");
    call strcat(cat_buf, " + Part 2");
    call Console.log("[5] Concat:       ", cat_buf);
    call free(cat_buf);

    # 6. Comparison (using strcmp)
    local s1: *u8 = "apple";
    local s2: *u8 = "banana";
    local res: i32 = call strcmp(s1, s2);

    call Console.log("[6] Compare:      'apple' vs 'banana' = ", res);
    if res < 0 {
        call Console.log("    -> 'apple' comes before 'banana'");
    }

    # 7. Length (using strlen)
    local len_s: *u8 = "12345";
    local len: u64 = call strlen(len_s);
    call Console.log("[7] Length:       '", len_s, "' is ", len, " chars long");

    # 8. Custom Processing (To Uppercase)
    local mixed: u8[32] = "Hello World 123";
    call to_upper(&mixed);
    call Console.log("[8] To Upper:     ", mixed);

    return 0;
}
