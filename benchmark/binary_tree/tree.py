import sys

# Increase recursion limit for deep trees
sys.setrecursionlimit(20000)


class Node:
    def __init__(self, value):
        self.value = value
        self.left = None
        self.right = None


def insert(root, val):
    if root is None:
        return Node(val)

    if val < root.value:
        root.left = insert(root.left, val)
    else:
        root.right = insert(root.right, val)
    return root


def count_nodes(root):
    if root is None:
        return 0
    return 1 + count_nodes(root.left) + count_nodes(root.right)


def main():
    root = None
    seed = 12345
    count = 100000

    for i in range(count):
        seed = (seed * 1664525 + 1013904223) % 2147483647
        if seed < 0:
            seed = -seed

        root = insert(root, seed)

    nodes = count_nodes(root)
    print(f"Tree nodes: {nodes}")


if __name__ == "__main__":
    main()
