import [Console] from "std/io.x";

# Test function-level generics
frame identity(val: T) ret T {
    return val;
}

frame swap(a: A, b: B) ret A {
    call Console.log("Before swap: a=", a, ", b=", b);
    return a;
}

# Test struct with methods
struct Box<T> {
    value: T,

    frame wrap(other: U) ret U {
        # Method with different generic parameter (OK)

        call Console.log("Wrapping value ", this.value, " with ", other);
        return other;
    }
}

# Test non-generic struct with generic method
struct Container {
    count: u64,

    frame process(item: T) ret T {
        call Console.log("Processing item: ", item, " (count=", this.count, ")");
        return item;
    }
}

frame main() ret u8 {
    # Test generic function
    local x: u64 = call identity(42);
    call Console.log("Identity of 42: ", x);

    local y: u64 = call swap(100, 200);
    call Console.log("Result: ", y);

    # Test generic struct method
    local box: Box<u64> = {value: 10};
    local result: u32 = call box.wrap(20);
    call Console.log("Wrap result: ", result);

    # Test non-generic struct with generic method
    local c: Container = {count: 5};
    local v: u64 = call c.process(999);
    call Console.log("Process result: ", v);

    return 0;
}
