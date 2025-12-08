# Test generic struct with method chaining
struct Box<T> {
    value: T,

    static new(val: T) ret Box<T> {
        local b: Box<T>;
        b.value = val;
        return b;
    }

    frame get() ret T {
        return this.value;
    }
}

frame main() {
    # Test: Method call on function call result
    local val: u64 = call call Box<u64>.new(42).get();
}
