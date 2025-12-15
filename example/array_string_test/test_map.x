import Console from "std/io.x";
import [Array] from "std/array.x";
import [Map] from "std/map.x";

frame main() {
    # Test Map with key updates  
    call Console.log("=== Testing Map<u64, u64> ===");
    local numMap: Map<u64, u64>;
    numMap.keys.length = 0;
    numMap.keys.capacity = 0;
    numMap.keys.data = cast<*u64>(0);
    numMap.values.length = 0;
    numMap.values.capacity = 0;
    numMap.values.data = cast<*u64>(0);

    call Console.log("Putting (1, 100), (2, 200), (1, 150) - updates key 1");
    call numMap.put(1, 100);
    call numMap.put(2, 200);
    call numMap.put(1, 150); # This should update value for key 1

    call Console.log("Map size: ", call numMap.size());
    call Console.log("Get key 1: ", call numMap.get(1));
    call Console.log("Get key 2: ", call numMap.get(2));

    call Console.log("Expected: size=2, key 1=150 (updated), key 2=200");
}
