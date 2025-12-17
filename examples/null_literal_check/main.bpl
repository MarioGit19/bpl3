extern printf(fmt: string, ...);

struct P {
    x: int,
    y: int,
}

frame main() ret int {
    # Create a struct with literal
    local p: P = P { x: 5, y: 10 };

    printf("Created struct p\n");

    if (p == null) {
        printf("p == null: true\n");
    } else {
        printf("p == null: false\n");
    }

    return 0;
}
