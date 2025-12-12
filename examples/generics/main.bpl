extern printf(fmt: string, ...);
# Generic-like example using separate struct definitions
# (True generics require monomorphization which is not yet implemented)
struct IntBox {
    value: int,
}
struct FloatBox {
    value: float,
}
frame make_int_box(val: int) ret IntBox {
    local b: IntBox;
    b.value = val;
    return b;
}
frame make_float_box(val: float) ret FloatBox {
    local b: FloatBox;
    b.value = val;
    return b;
}
frame main() ret int {
    # Test different struct types (simulating generics)
    local int_box: IntBox = make_int_box(100);
    printf("Int box value: %d\n", int_box.value);
    local float_box: FloatBox = make_float_box(2.718);
    printf("Float box value: %.3f\n", float_box.value);
    local another_box: IntBox = make_int_box(42);
    printf("Another int box: %d\n", another_box.value);
    return 0;
}
