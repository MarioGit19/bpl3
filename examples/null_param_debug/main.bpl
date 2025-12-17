extern printf(fmt: string, ...);

struct Data {
    value: int,
    flag: bool,
}

frame testParam(d: Data) {
    printf("In testParam\n");
    printf("d.value=%d\n", d.value);

    if (d.flag) {
        printf("d.flag=true\n");
    } else {
        printf("d.flag=false\n");
    }

    if (d == null) {
        printf("d is null!\n");
    } else {
        printf("d is NOT null\n");
    }

    printf("Accessing d.value...\n");
    local val: int = d.value;
    printf("Got value: %d\n", val);
}

frame main() ret int {
    printf("Test: Passing null as parameter\n");
    local data: Data = null;

    try {
        testParam(data);
        printf("ERROR: Should have thrown!\n");
    } catch (e: NullAccessError) {
        printf("Caught: %s in %s (expr: %s)\n", e.message, e.function, e.expression);
    }
    printf("Test completed\n");
    return 0;
}
