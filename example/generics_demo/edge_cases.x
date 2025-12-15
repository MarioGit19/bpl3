import [Console] from "std/io.x";

struct Container<T> {
    data: T,
}

struct Wrapper<U> {
    container: Container<U>,
}

struct ArrayWrapper<T> {
    data: T[5],
}

struct PointerWrapper<T> {
    ptr: *T,
}

struct Multi<A, B, C> {
    a: A,
    b: B,
    c: C,
}

frame main() ret u8 {
    local w: Wrapper<Container<Multi<u64, u8, u16>>>;
    w.container.data.data.a = 111;
    call Console.log("Nested: ", w.container.data.data.a);

    local aw: ArrayWrapper<u64>;
    aw.data[0] = 222;
    aw.data[4] = 333;
    call Console.log("Array[0]: ", aw.data[0]);
    call Console.log("Array[4]: ", aw.data[4]);

    local val: u64 = 444;
    local pw: PointerWrapper<u64>;
    pw.ptr = &val;
    call Console.log("Pointer: ", *pw.ptr);

    local m: Multi<u64, u8, u32>;
    m.a = 555;
    m.b = 66;
    m.c = 7777;
    call Console.log("Multi: ", m.a, ", ", m.b, ", ", m.c);

    return 0;
}
