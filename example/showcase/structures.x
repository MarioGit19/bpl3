import malloc, free, printf from "./libc.x";

# Generic Node
struct Node {
    data: *u8,
    next: *Node,
}

# Generic LinkedList
struct LinkedList {
    head: *Node,
    size: u64,
}

frame list_create() ret *LinkedList {
    local list: *LinkedList = call malloc(16);
    list.head = 0; # null
    list.size = 0;
    return list;
}

frame list_push(list: *LinkedList, data: *u8) {
    local node: *Node = call malloc(16);
    node.data = data;
    node.next = list.head;
    list.head = node;
    list.size = list.size + 1;
}

frame list_pop(list: *LinkedList) ret *u8 {
    if list.head == 0 {
        return 0;
    }
    local node: *Node = list.head;
    local data: *u8 = node.data;
    list.head = node.next;
    call free(node);
    list.size = list.size - 1;
    return data;
}

frame list_destroy(list: *LinkedList) {
    local current: *Node = list.head;
    loop {
        if current == 0 {
            break;
        }
        local next: *Node = current.next;
        call free(current);
        current = next;
    }
    call free(list);
}

# Generic Stack (wrapper around LinkedList)
struct Stack {
    list: *LinkedList,
}

frame stack_create() ret *Stack {
    local s: *Stack = call malloc(8);
    s.list = call list_create();
    return s;
}

frame stack_push(s: *Stack, data: *u8) {
    call list_push(s.list, data);
}

frame stack_pop(s: *Stack) ret *u8 {
    return call list_pop(s.list);
}

frame stack_destroy(s: *Stack) {
    call list_destroy(s.list);
    call free(s);
}

export [Node];
export [LinkedList];
export list_create;
export list_push;
export list_pop;
export list_destroy;
export [Stack];
export stack_create;
export stack_push;
export stack_pop;
export stack_destroy;
