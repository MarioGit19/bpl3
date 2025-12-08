# Test method chaining on generic type
struct Container<T> {
    value: T,

    static make(val: T) ret Container<T> {
        local c: Container<T>;
        c.value = val;
        return c;
    }

    frame extract() ret T {
        return this.value;
    }
}

frame main() {
    # Test: Chained call with nested function calls
    # The inner call returns Container<u64>
    # The outer call should call extract() on that result
    local result: Container<u64> = call Container<u64>.make(99);
    local _val: u64 = call call Container<u64>.make(42).extract();
}
