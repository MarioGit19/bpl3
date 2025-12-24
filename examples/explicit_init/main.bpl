extern malloc(size: long) ret *void;
extern free(ptr: *void);
extern printf(fmt: string, ...) ret int;

import * as std from "std";

struct User {
    id: int,
    active: bool,
}

frame main() ret int {
    # Allocate memory for User
    local ptr: *User = cast<*User>(malloc(sizeof(User)));

    # Initialize memory
    std.Memory.init<User>(ptr);

    # Test nested enum access
    local opt: std.Option<int> = std.Option<int>.Some(123);
    if (match<std.Option.Some>(opt)) {
        printf("Option works!\n");
    }
    # Manually setting fields
    ptr.id = 42;
    ptr.active = true;

    printf("User ID: %d\n", ptr.id);

    free(cast<*void>(ptr));
    return 0;
}
