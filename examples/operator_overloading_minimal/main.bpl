# Minimal test for generic operator overloading

extern printf(fmt: string, ...);

struct Box<T> {
    val: T,
    frame __add__(this: *Box<T>, other: T) ret Box<T> {
        local result: Box<T>;
        result.val = this.val + other;
        return result;
    }
}

frame main() ret int {
    local b: Box<i32>;
    local addend: i32 = 5;
    b.val = 10;
    local b2: Box<i32> = b + addend;
    printf("value: %d\n", b2.val);
    return 0;
}
