class Node {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
  }
}

function insert(root, val) {
  if (root === null) {
    return new Node(val);
  }

  if (val < root.value) {
    root.left = insert(root.left, val);
  } else {
    root.right = insert(root.right, val);
  }
  return root;
}

function countNodes(root) {
  if (root === null) {
    return 0;
  }
  return 1 + countNodes(root.left) + countNodes(root.right);
}

function main() {
  let root = null;
  let seed = 12345;
  const count = 100000;

  for (let i = 0; i < count; i++) {
    seed = (seed * 1664525 + 1013904223) % 2147483647;
    if (seed < 0) seed = -seed;

    root = insert(root, seed);
  }

  const nodes = countNodes(root);
  console.log(`Tree nodes: ${nodes}`);
}

main();
