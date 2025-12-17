extern printf(fmt: string, ...);

struct Point {
    x: int,
    y: int,
}

frame main() ret int {
    local p: Point = null;

    printf("Testing null object access trap...\n");
    printf("Attempting to access p.x on null object:\n");

    # This will trap with an error message
    local val: int = p.x;

    printf("This should not print\n");
    return 0;
}
