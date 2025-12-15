import [Console] from "std/io.x";

# Test non-generic struct with non-generic method
struct Container {
    count: u64,

    frame process(item: u64) ret u64 {
        call Console.log("Processing item: ", item, " (count=", this.count, ")");
        return item;
    }
}

frame main() ret u8 {
    local c: Container = {count: 5};
    local v: u64 = call c.process(999);
    call Console.log("Process result: ", v);

    return 0;
}
