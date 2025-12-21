extern printf(fmt: string, ...);
extern malloc(size: int) ret *void;
extern free(ptr: *void);

struct Node {
    value: int,
    left: *Node,
    right: *Node,
}

frame create_node(val: int) ret *Node {
    local node: *Node = cast<*Node>(malloc(sizeof(Node)));
    node.value = val;
    node.left = nullptr;
    node.right = nullptr;
    return node;
}

frame insert(root: *Node, val: int) ret *Node {
    if (root == nullptr) {
        return create_node(val);
    }
    if (val < root.value) {
        root.left = insert(root.left, val);
    } else {
        root.right = insert(root.right, val);
    }
    return root;
}

frame free_tree(root: *Node) {
    if (root == nullptr) {
        return;
    }
    free_tree(root.left);
    free_tree(root.right);
    free(cast<*void>(root));
}

frame count_nodes(root: *Node) ret int {
    if (root == nullptr) {
        return 0;
    }
    return 1 + count_nodes(root.left) + count_nodes(root.right);
}

frame main() ret int {
    local root: *Node = nullptr;
    local seed: int = 12345;
    local i: int = 0;
    local count: int = 100000;

    # Insert random numbers
    loop (i < count) {
        # Simple LCG
        seed = ((seed * 1664525) + 1013904223) % 2147483647; # Use 31-bit positive int
        if (seed < 0) {
            seed = -seed;
        }
        root = insert(root, seed);
        i = i + 1;
    }

    local nodes: int = count_nodes(root);
    printf("Tree nodes: %d\n", nodes);

    free_tree(root);
    return 0;
}
