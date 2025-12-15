import [Console] from "std/io.x";

# Test non-generic struct with generic method
struct Container {
    count: u64,

    frame process(item: T) ret T {
        call Console.log("Processing item: ", item, " (count=", this.count, ")");
        return item;
    }
}

frame main() ret u8 {
    # Test non-generic struct with generic method
    local c: Container = {count: 5};
    local v: u64 = call c.process(999);
    call Console.log("Process result: ", v);

    local x: u32 = call c.process(42);
    call Console.log("Process result: ", x);

    return 0;
}
