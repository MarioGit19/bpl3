import [Console] from "std/io.x";
import [Array] from "std/array.x";
import [String] from "std/string.x";

frame main() {
    # Test Array<String>
    local stringArr: Array<String>;
    stringArr.length = 0;
    stringArr.capacity = 0;
    stringArr.data = cast<*String>(0);

    local s1: String = call String.new("Hello");

    local s2: String = call String.new("World");

    call stringArr.push(s1);
    call stringArr.push(s2);

    call Console.log("String Array Length: ", call stringArr.len());

    local retrieved: String = call stringArr.get(0);
    call Console.log("First string: ", call retrieved.c_str());

    retrieved = (call stringArr.get(1));
    call Console.log("Second string: ", call retrieved.c_str());

    # Test String methods
    call Console.print_str("s1 charAt 1: ");
    call Console.print_char(call s1.charAt(1));
    call Console.log("s1 indexOf 'l': ", call s1.indexOf('l'));
    call Console.log("s1 indexOf 'z': ", call s1.indexOf('z'));

    local s3: String = call String.new("Hello");

    call Console.log("s1 equals s3: ", call s1.equals(&s3));
    call Console.log("s1 equals s2: ", call s1.equals(&s2));

    # Test Array methods
    local intArr: Array<u64>;
    intArr.length = 0;
    intArr.capacity = 0;
    intArr.data = cast<*u64>(0);
    call intArr.push(100);
    call intArr.push(200);
    call intArr.set(0, 999);
    call Console.log("Modified intArr[0]: ", call intArr.get(0));
    call intArr.clear();
    call Console.log("Cleared intArr length: ", call intArr.len());
}
