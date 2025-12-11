extern printf(format: string, ...) ret int;

frame hello() {
    printf("Hello from std_dummy.bpl\n");
}

struct Point {
    x: int,
    y: int,
}

export hello;
export [Point];
