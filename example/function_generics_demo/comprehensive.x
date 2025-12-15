import [Console] from "std/io.x";

# Test function-level generics
frame identity<T>(val: T) ret T {
    return val;
}

frame swap<A, B>(a: A, b: B) ret A {
    call Console.log("Swap: a=", a, ", b=", b);
    return a;
}

# Test non-generic struct with generic method
struct Container {
    count: u64,

    frame process<T>(item: T) ret T {
        call Console.log("Processing item: ", item, " (count=", this.count, ")");
        return item;
    }

    frame add<T>(a: T, b: T) ret T {
        call Console.log("Adding: ", a, " + ", b, " (count=", this.count, ")");
        return a;
    }
}
frame main() ret u8 {
    # Test generic functions
    local x: u64 = call identity<u64>(42);
    call Console.log("identity<u64>(42) = ", x);

    local y: u32 = call identity<u32>(100);
    call Console.log("identity<u32>(100) = ", y);

    local z: u64 = call swap<u64, u32>(1000, 2000);
    call Console.log("swap result = ", z);

    # Test non-generic struct with generic methods
    local c: Container = {count: 5};

    local v1: u64 = call c.process<u64>(999);
    call Console.log("process<u64> result: ", v1);

    local v2: u32 = call c.process<u32>(42);
    call Console.log("process<u32> result: ", v2);

    local sum: u64 = call c.add<u64>(10, 20);
    call Console.log("add<u64> result: ", sum);

    return 0;
}
