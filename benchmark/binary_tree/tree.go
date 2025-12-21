package main

import "fmt"

type Node struct {
	value int
	left  *Node
	right *Node
}

func insert(root *Node, val int) *Node {
	if root == nil {
		return &Node{value: val}
	}

	if val < root.value {
		root.left = insert(root.left, val)
	} else {
		root.right = insert(root.right, val)
	}
	return root
}

func countNodes(root *Node) int {
	if root == nil {
		return 0
	}
	return 1 + countNodes(root.left) + countNodes(root.right)
}

func main() {
	var root *Node
	var seed int64 = 12345
	count := 100000

	for i := 0; i < count; i++ {
		seed = (seed*1664525 + 1013904223) % 2147483647
		if seed < 0 {
			seed = -seed
		}

		root = insert(root, int(seed))
	}

	nodes := countNodes(root)
	fmt.Printf("Tree nodes: %d\n", nodes)
}
