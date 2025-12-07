#!/bin/bash
source ../test_utils.sh

# Configuration
SOURCE_FILE="tuple_demo.x"
EXE="${SOURCE_FILE%.x}"

# Compile
compile "$SOURCE_FILE"
if [ $? -ne 0 ]; then
    exit 1
fi

# Run Test - check for expected outputs from all test cases
assert_output "$EXE" "" "" "" \
    "Test 1: Basic Tuples" \
    "Coordinates: (10, 20)" \
    "Mixed tuple: (42, 1000, -50)" \
    "Test 2: Tuple as Return Value" \
    "17 / 5 = 3 remainder 2" \
    "Test 3: Destructuring" \
    "Destructured (explicit types): x=100, y=200, z=300" \
    "Destructured: a=50, b=75" \
    "Test 4: Tuples with Pointers" \
    "Values via pointers: 100, 200" \
    "Test 5: Swapping Values" \
    "Before swap: x=10, y=20" \
    "After swap: x=20, y=10" \
    "All Tests Passed"

if [ $? -ne 0 ]; then
    exit 1
fi

# Test simple.x
compile "simple.x"
if [ $? -ne 0 ]; then
    exit 1
fi

assert_output "simple" "" "" "" \
    "Tuple: (10, 20)"

if [ $? -ne 0 ]; then
    exit 1
fi

# Cleanup
rm -f "$EXE"
rm -f "simple"
rm -f *.o
rm -f *.asm
rm -f *.ll

echo "✅ All tuple_demo tests passed!"
