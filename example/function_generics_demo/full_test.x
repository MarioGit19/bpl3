import [Console] from "std/io.x";

# Generic function
frame identity(val: T) ret T {
    return val;
}

frame swap(a: A, b: B) ret A {
    return a;
}

# Non-generic struct with generic methods
struct Container {
    count: u64,

    frame process(item: T) ret T {
        call Console.log("Processing ", item, " (count=", this.count, ")");
        return item;
    }

    frame add(a: T, b: T) ret T {
        return a;
    }
}

frame main() ret i32 {
    call Console.log("=== Testing Generic Functions ===");

    # Test generic functions with different types
    local x: u64 = call identity(42);
    call Console.log("identity<u64>(42) = ", x);

    local y: u32 = call identity(100);
    call Console.log("identity<u32>(100) = ", y);

    local z: u64 = call swap(1000, 2000);
    call Console.log("swap<u64, u32>(1000, 2000) = ", z);

    call Console.log("\n=== Testing Generic Methods ===");

    # Test generic methods on non-generic struct
    local c: Container = {count: 5};

    local v1: u64 = call c.process(999);
    call Console.log("Result: ", v1);

    local v2: u32 = call c.process(42);
    call Console.log("Result: ", v2);

    local sum: u64 = call c.add(10, 20);
    call Console.log("add<u64>(10, 20) = ", sum);

    call Console.log("\n=== All Tests Passed! ===");
    return 0;
}
