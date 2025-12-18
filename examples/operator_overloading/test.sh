#!/bin/bash

# Test script for operator overloading
cd "$(dirname "$0")"

echo "=== Compiling operator overloading test ==="
../../bpl main.bpl -o test_op_overload

if [ $? -ne 0 ]; then
    echo "Compilation failed!"
    exit 1
fi

echo ""
echo "=== Running test ==="
./test_op_overload

exit_code=$?

echo ""
if [ $exit_code -eq 0 ]; then
    echo "Test completed successfully!"
else
    echo "Test failed with exit code $exit_code"
fi

exit $exit_code
