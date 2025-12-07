import printf from "libc";

frame baz() {
    throw 42;
}

frame bar() {
    call baz();
}

frame foo() {
    call bar();
}

frame main() ret u8 {
    call foo();
    return 0;
}
