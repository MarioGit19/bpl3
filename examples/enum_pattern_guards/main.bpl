# Test pattern guards in match expressions

extern printf(fmt: string, ...) ret int;

enum Option<T> {
    Some(T),
    None,
}

frame classify_value(opt: Option<int>) ret string {
    return match (opt) {
        Option<int>.Some(x) if x > 0 => "positive",
        Option<int>.Some(x) if x < 0 => "negative",
        Option<int>.Some(x) => "zero",
        Option<int>.None => "none",
    };
}

frame main() ret int {
    local pos: Option<int> = Option<int>.Some(42);
    local neg: Option<int> = Option<int>.Some(-5);
    local zero: Option<int> = Option<int>.Some(0);
    local none: Option<int> = Option<int>.None;

    printf("42: %s\n", classify_value(pos));
    printf("-5: %s\n", classify_value(neg));
    printf("0: %s\n", classify_value(zero));
    printf("None: %s\n", classify_value(none));

    return 0;
}
