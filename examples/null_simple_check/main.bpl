extern printf(fmt: string, ...);

struct P {
    x: int,
    y: int,
}

frame main() ret int {
    local p: P = null;

    if (p == null) {
        printf("p is null\n");
    } else {
        printf("p is not null\n");
    }

    return 0;
}
