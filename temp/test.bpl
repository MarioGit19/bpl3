global x: int[3][2];

struct Parent<V> {
    val: V,
}

struct Child<T, V> : Parent<V> {
    childVal: T,
}

frame foo() ret int {
    return 42;
}

frame main() ret void {
    local y: int = 1;
    local z: int = foo();
    local f: float = 1.5;
    local c: char = 'a';
    local s: string = "hello";
}
