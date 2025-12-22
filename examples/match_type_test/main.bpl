extern printf(fmt: string, ...);

enum Option<T> {
    Some(T),
    None,
}

frame main() ret int {
    local opt: Option<int> = Option<int>.Some(42);

    if (match<Option.Some>(opt)) {
        printf("Is Some\n");
    }
    if (!match<Option.None>(opt)) {
        printf("Is not None\n");
    }
    return 0;
}
