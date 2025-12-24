extern printf(fmt: string, ...) ret int;

struct Point {
    x: int,
    y: int,
}

frame main() ret int {
    printf("Extern with type OK\n");
    return 0;
}
