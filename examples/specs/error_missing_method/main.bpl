spec S {
    frame required(this: *Self);
}

struct Incomplete: S {
    x: int,
    # Missing required method
}

frame main() {
    local i: Incomplete = Incomplete { x: 1 };
}
