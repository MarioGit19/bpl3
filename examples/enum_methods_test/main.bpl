extern printf(fmt: string, ...);

enum Status {
    Pending,
    Active,
    Completed,

    frame is_active(this: Status) ret bool {
        return match<Status.Active>(this);
    }

    frame code(this: Status) ret int {
        return match (this) {
            Status.Pending => 0,
            Status.Active => 1,
            Status.Completed => 2,
        };
    }
}

frame main() ret int {
    local s: Status = Status.Active;

    if (s.is_active()) {
        printf("Status is active\n");
    }
    printf("Status code: %d\n", s.code());

    return 0;
}
