extern printf(fmt: string, ...);

struct P {
    x: int,
    y: int,
}

frame main() ret int {
    local p: P = null;
    local size: int = sizeof(P);

    printf("sizeof(P): %d\n", size);

    if (p == null) {
        printf("p == null: true\n");
    } else {
        printf("p == null: false\n");
    }

    return 0;
}
