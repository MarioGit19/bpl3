extern printf(fmt: string, ...);

struct P {
    x: int,
    y: int,
}

frame main() ret int {
    local p: P = null;
    local q: P;
    q = null;

    if (p == null) {
        printf("p == null: true %d %d\n", p == null, q == null);
    } else {
        printf("p == null: false\n");
    }

    # Create a properly initialized struct using literal syntax
    local r: P = P { x: 1, y: 0 };
    q = r;

    if (q == null) {
        printf("q == null after init: true\n");
    } else {
        printf("q == null after init: false %d %d\n", q.x, q.y);
    }

    return 0;
}
