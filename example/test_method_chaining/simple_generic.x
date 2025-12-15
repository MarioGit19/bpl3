# Test static method on generic type
struct Container<T> {
    value: T,

    static make(val: T) ret Container<T> {
        local c: Container<T>;
        c.value = val;
        return c;
    }
}

frame main() {
    # Call static method on generic type instantiation
    local c: Container<u64> = call Container<u64>.make(42);
}
