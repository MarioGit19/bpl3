# Example demonstrating the unified standard library import

import [IO], [Array], [String], [Map], [Math] from "std";

frame main() ret int {
    IO.printString("--- Unified Standard Library Demo ---");

    # Using String
    local s: String = String.new("Hello from std!");
    IO.print("String: ");
    IO.printString(s.cstr());
    s.destroy();

    # Using Array
    local arr: Array<int> = Array<int>.new(5);
    arr.push(1);
    arr.push(2);
    arr.push(3);
    IO.print("Array size: ");
    IO.printInt(arr.len());
    arr.destroy();

    # Using Map
    local m: Map<int, int> = Map<int, int>.new(10);
    m.set(1, 100);
    m.set(2, 200);
    IO.print("Map get(1): ");
    if (m.has(1)) {
        IO.printInt(m.get(1).unwrap());
    }
    m.destroy();

    # Using Math
    IO.print("Math.minInt(5, 10): ");
    IO.printInt(Math.minInt(5, 10));

    return 0;
}
