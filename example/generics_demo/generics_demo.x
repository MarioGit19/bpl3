import [Console] from "std/io.x";

struct Box<T> {
    value: T,
}

struct Pair<A, B> {
    first: A,
    second: B,
}

frame main() ret u8 {
    local b: Box<u64>;
    b.value = 123;
    call Console.log(b.value);

    local p: Pair<u64, Box<u64>>;
    p.first = 456;
    p.second.value = 789;

    call Console.log(p.first);
    call Console.log(p.second.value);

    return 0;
}
