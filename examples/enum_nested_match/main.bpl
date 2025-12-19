# Nested match expressions with enums

enum Status {
    Ready,
    Busy,
    Error,
}

frame get_status_code(s: Status) ret int {
    return match (s) {
        Status.Ready => 0,
        Status.Busy => 1,
        Status.Error => 2,
    };
}

frame check_nested(s1: Status, s2: Status) ret int {
    local code1: int = get_status_code(s1);
    local code2: int = get_status_code(s2);
    return code1 + code2;
}

frame main() ret int {
    local s1: Status = Status.Ready;
    local s2: Status = Status.Error;
    return check_nested(s1, s2);
}
