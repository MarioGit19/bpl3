import [Option], [Result], [String], [Array] from "std/std.x";
import [Console] from "std/io.x";

frame test_string() {
    call Console.log("Testing String...");
    local s: String = call String.new("Hello");
    call s.append_char(' ');
    call s.append("World");
    call s.append_char('!');

    call Console.log("String: ", call s.c_str());
    call Console.log("Length: ", call s.len());

    local s2: String = call String.new(" from BPL");
    call s.concat(&s2);

    call Console.log("Concatenated: ", call s.c_str());

    call s.free();
    call s2.free();
}

frame test_option() {
    # call Console.print_str("Testing Option...\n");
    # ...
}

frame test_result() {
    # ...
}

frame test_array() {
    call Console.log("Testing Array...");
    local arr: Array<u64> = call Array<u64>.empty(10);
    call arr.push(1);
    call arr.push(2);
    call Console.log("Array len: ", call arr.len());
    call arr.free();

    call Console.log("Testing Array literal...");
    local arr2: Array<u64> = call Array<u64>.new([10, 20, 30]);
    call Console.log("Array2 len: ", call arr2.len());
    call Console.log("Array2[0]: ", call arr2.get(0));
    call Console.log("Array2[1]: ", call arr2.get(1));
    call Console.log("Array2[2]: ", call arr2.get(2));
    call arr2.free();
}

frame main() {
    call Console.log("-----------------------------------");
    call test_string();
    call Console.log("-----------------------------------");
    call test_array();
    call Console.log("-----------------------------------");
    # call test_option();
    call Console.log("-----------------------------------");
    # call test_result();
    call Console.log("-----------------------------------");
}
