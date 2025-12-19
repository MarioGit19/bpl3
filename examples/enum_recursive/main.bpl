# Test recursive enums with pointers

extern printf(fmt: string, ...) ret int;
extern malloc(size: u64) ret *void;

enum List {
    Nil,
    Cons(int, *List),
}

frame list_sum(list: *List) ret int {
    if (list == null) {
        return 0;
    }
    return match (*list) {
        List.Nil => 0,
        List.Cons(value, next) => value + list_sum(next),
    };
}

frame main() ret int {
    # Create list: 1 -> 2 -> 3 -> Nil
    local node3: *List = malloc(16);
    *node3 = List.Nil;

    local node2: *List = malloc(16);
    *node2 = List.Cons(3, node3);

    local node1: *List = malloc(16);
    *node1 = List.Cons(2, node2);

    local head: *List = malloc(16);
    *head = List.Cons(1, node1);

    local sum: int = list_sum(head);
    printf("List sum: %d\n", sum);

    return sum;
}
