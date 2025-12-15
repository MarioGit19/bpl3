import malloc from "libc";
import [Console] from "std/io.x";
import [String] from "std/string.x";
import [Array] from "std/array.x";

extern malloc(size: u64) ret *u8;

frame add_two(a: T, b: U) ret V {
    local res: V = a + b;
    return res;
}

frame main() {
    local result: u64 = call add_two(-273, cast<u8>(13));
    call Console.log("Result: ", result);

    local my_string: String = {data: "resiiio"};

    call Console.log("String length: ", my_string.length);
    call Console.log("String data: ", my_string.data);

    local new_string: String = {data: "-sam-te"};

    call Console.log("Concatenated String: ", my_string.data);
    call Console.log("Concatenated String length: ", my_string.length);

    local int_array: Array<u64>;

    call int_array.push(42);
    call int_array.push(84);
    call int_array.push(33);
    call Console.log("Array length after pushes: ", int_array.length);
    local popped_value: u64 = call int_array.pop();
    call Console.log("Popped value: ", popped_value);
    call int_array.pop();
    call int_array.pop();
    local underflow_value: u64 = call int_array.pop();
    call Console.log("Underflow pop value: ", underflow_value);

    local string_array: Array<String>;
    string_array.data = cast<*String>(call malloc(5 * 16)); # Allocate space for 5 String elements
    string_array.length = 0;
    call string_array.push(my_string);
    call string_array.push(new_string);
    call Console.log("String Array length after pushes: ", string_array.length);
    local poped_string: String = call string_array.pop();
    call Console.log("First poped string data: ", poped_string.data);
    poped_string = (call string_array.pop());
    call Console.log("Second poped string data: ", poped_string.data);
    poped_string = (call string_array.pop());
    call Console.log("Underflow poped string data: ", poped_string.data);
}
