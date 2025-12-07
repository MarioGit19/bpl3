import [Console] from "std/io.x";
import [Array] from "std/array.x";
import [Set] from "std/set.x";
import [Map] from "std/map.x";

frame main() {
    # Test Set with duplicate checking
    call Console.log("=== Testing Set<u64> ===");
    local numSet: Set<u64>;
    numSet.items.length = 0;
    numSet.items.capacity = 0;
    numSet.items.data = cast<*u64>(0);

    call Console.log("Adding 10, 20, 30, 20 (duplicate)");
    call numSet.add(10);
    call numSet.add(20);
    call numSet.add(30);
    call numSet.add(20); # This should not be added (duplicate)

    call Console.log("Set size: ", call numSet.size());
    call Console.log("Has 20: ", call numSet.has(20));
    call Console.log("Has 40: ", call numSet.has(40));

    call Console.log("Deleting 20");
    call numSet.delete(20);
    call Console.log("Set size after delete: ", call numSet.size());
    call Console.log("Has 20 after delete: ", call numSet.has(20));

    # Test Map with key updates
    call Console.log("\n=== Testing Map<u64, u64> ===");
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
    call Console.log("Has key 1: ", call numMap.has(1));
    call Console.log("Has key 3: ", call numMap.has(3));

    call Console.log("Deleting key 1");
    call numMap.delete(1);
    call Console.log("Map size after delete: ", call numMap.size());
    call Console.log("Has key 1 after delete: ", call numMap.has(1));
}
