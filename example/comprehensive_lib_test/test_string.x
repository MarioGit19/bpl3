import [Console] from "std/io.x";
import [String] from "std/string.x";
import assert from "./utils.x";

frame main() {
    local s1: String = call String.new("Hello");
    local s2: String = call String.new(" World");

    call assert((call s1.len()) == 5, "String length is 5");
    call assert((call s1.charAt(0)) == 'H', "First char is H");

    # Test concat
    call s1.concat(&s2);
    call assert((call s1.len()) == 11, "String length is 11 after concat");
    call assert(call String.streq(s1.buffer, "Hello World"), "String content is Hello World");

    # Test slice
    local s3: String;
    call s1.slice(6, 11, &s3);
    call assert((call s3.len()) == 5, "Slice length is 5");
    call assert(call String.streq(s3.buffer, "World"), "Slice content is World");

    # Test equals
    local s4: String = call String.new("World");

    call assert(call s3.equals(&s4), "Strings are equal");

    # Test indexOf
    call assert((call s1.indexOf('W')) == 6, "Index of W is 6");
    call assert((call s1.indexOf('z')) == -1, "Index of z is -1");

    # Test atoi
    call assert((call String.atoi("123")) == 123, "atoi 123");
    call assert((call String.atoi("-456")) == -456, "atoi -456");

    # Test to_upper
    local s5: u8[10];
    s5[0] = 'a';
    s5[1] = 'b';
    s5[2] = 'c';
    s5[3] = 0;
    call String.to_upper(s5);
    call assert(call String.streq(s5, "ABC"), "to_upper abc -> ABC");

    # Test to_lower
    s5[0] = 'X';
    s5[1] = 'Y';
    s5[2] = 'Z';
    s5[3] = 0;
    call String.to_lower(s5);
    call assert(call String.streq(s5, "xyz"), "to_lower XYZ -> xyz");

    # Test atoi edge cases
    call assert((call String.atoi("  789")) == 789, "atoi with leading spaces");
    call assert((call String.atoi("0")) == 0, "atoi 0");

    # Test indexOf edge cases
    call assert((call s1.indexOf('H')) == 0, "Index of H is 0");
    call assert((call s1.indexOf('d')) == 10, "Index of d is 10");
}
