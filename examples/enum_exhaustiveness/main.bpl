# Demonstrates exhaustiveness checking in match expressions
# All match expressions must cover all enum variants or use wildcard

enum Status {
    Idle,
    Running,
    Paused,
    Completed,
    Error,
}

# Exhaustive match - covers all variants
frame status_to_code(s: Status) ret int {
    return match (s) {
        Status.Idle => 0,
        Status.Running => 1,
        Status.Paused => 2,
        Status.Completed => 3,
        Status.Error => 4,
    };
}

# Using wildcard for default case
frame is_active(s: Status) ret int {
    return match (s) {
        Status.Running => 1,
        Status.Paused => 1,
        _ => 0,
    };
}

# Multiple match expressions with different patterns
frame get_priority(s: Status) ret int {
    return match (s) {
        Status.Error => 10,
        Status.Running => 5,
        Status.Paused => 3,
        Status.Idle => 1,
        Status.Completed => 0,
    };
}

frame main() ret int {
    local idle: Status = Status.Idle;
    local running: Status = Status.Running;
    local paused: Status = Status.Paused;
    local completed: Status = Status.Completed;
    local error: Status = Status.Error;

    # Test status_to_code
    local code1: int = status_to_code(idle); # 0
    local code2: int = status_to_code(running); # 1
    local code3: int = status_to_code(paused); # 2
    local code4: int = status_to_code(completed); # 3
    local code5: int = status_to_code(error); # 4

    # Test is_active
    local active1: int = is_active(running); # 1
    local active2: int = is_active(paused); # 1
    local active3: int = is_active(idle); # 0

    # Test get_priority
    local prio1: int = get_priority(error); # 10
    local prio2: int = get_priority(running); # 5

    # Total: 0+1+2+3+4+1+1+0+10+5 = 27
    return code1 + code2 + code3 + code4 + code5 + active1 + active2 + active3 + prio1 + prio2;
}
