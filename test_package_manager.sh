#!/bin/bash

# Test script for BPL Package Manager functionality

set -e

echo "=== BPL Package Manager Test ==="
echo

# Clean up any existing test artifacts
echo "Cleaning up previous test artifacts..."
rm -rf /tmp/bpl-package-test
rm -rf ~/.bpl/packages/test-math-pkg
mkdir -p /tmp/bpl-package-test
cd /tmp/bpl-package-test

# Test 1: Initialize a new package
echo "Test 1: Initializing a new package..."
bun /home/pr0h0/Projects/bpl3/index.ts init
echo "✓ Package initialized"
echo

# Test 2: Create package code
echo "Test 2: Creating package code..."
cat > index.bpl << 'EOF'
export multiply;
export square;

frame multiply(a: int, b: int) ret int {
  return a * b;
}

frame square(x: int) ret int {
  return multiply(x, x);
}
EOF

# Update bpl.json
cat > bpl.json << 'EOF'
{
  "name": "test-math-pkg",
  "version": "1.0.0",
  "description": "Test math package",
  "main": "index.bpl",
  "author": "Test Author",
  "license": "MIT"
}
EOF
echo "✓ Package code created"
echo

# Test 3: Pack the package
echo "Test 3: Packing the package..."
bun /home/pr0h0/Projects/bpl3/index.ts pack
echo "✓ Package packed"
echo

# Test 4: Install package globally
echo "Test 4: Installing package globally..."
bun /home/pr0h0/Projects/bpl3/index.ts install test-math-pkg-1.0.0.tgz --global
echo "✓ Package installed globally"
echo

# Test 5: List installed packages
echo "Test 5: Listing installed packages..."
bun /home/pr0h0/Projects/bpl3/index.ts list --global | grep test-math-pkg
echo "✓ Package listed correctly"
echo

# Test 6: Use the package in a program
echo "Test 6: Using the package in a program..."
mkdir -p test-app
cd test-app

cat > main.bpl << 'EOF'
import square, multiply from "test-math-pkg";

extern printf(fmt: string, ...) ret int;

frame main() ret int {
    local result: int = square(5);
    printf("5 squared = %d\n", result);
    
    local product: int = multiply(3, 4);
    printf("3 * 4 = %d\n", product);
    
    return 0;
}
EOF

echo "Compiling test program..."
bun /home/pr0h0/Projects/bpl3/index.ts main.bpl
if [ $? -eq 0 ]; then
    echo "✓ Package import and compilation successful"
else
    echo "✗ Package compilation failed"
    exit 1
fi

echo "Running test program..."
clang -Wno-override-module main.ll -o main
OUTPUT=$(./main)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ] && echo "$OUTPUT" | grep -q "5 squared = 25" && echo "$OUTPUT" | grep -q "3 \* 4 = 12"; then
    echo "$OUTPUT"
    echo "✓ Package execution successful"
else
    echo "✗ Package execution failed (exit code: $EXIT_CODE)"
    exit 1
fi
echo

# Cleanup
echo "Cleaning up..."
cd /
rm -rf /tmp/bpl-package-test
rm -rf ~/.bpl/packages/test-math-pkg

echo
echo "=== All tests passed! ==="
