import [Console] from "std/io.x";
import [Array] from "std/array.x";
import [String] from "std/string.x";

frame main() {
    call Console.log("sizeof(String) = ", sizeof(String));

    local stringArr: Array<String>;
    stringArr.length = 0;
    stringArr.capacity = 0;
    stringArr.data = cast<*String>(0);

    call Console.log("Before push");

    local s1: String = call String.new("Hello");

    local s2: String = call String.new("World");

    call Console.log("Created s1 and s2");
    call Console.log("About to push s1");
    call stringArr.push(s1);
    call Console.log("Pushed s1");
    call Console.log("About to push s2");
    call stringArr.push(s2);
    call Console.log("Pushed s2");

    call Console.log("Array length: ", call stringArr.len());
    call Console.log("About to get element 0");
    local retrieved: String = call stringArr.get(0);
    call Console.log("Retrieved: ", retrieved.data);
}
