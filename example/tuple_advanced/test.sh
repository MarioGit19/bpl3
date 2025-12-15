#!/bin/bash
source ../test_utils.sh

# Configuration
SOURCE_FILE="tuple_advanced.x"
EXE="${SOURCE_FILE%.x}"

# Compile
compile "$SOURCE_FILE"
if [ $? -ne 0 ]; then
    exit 1
fi

# Run Test - check for expected outputs from all test cases
assert_output "$EXE" "" "" "" \
    "Test 1: get_i64_value with valid pointer" \
    "Success! Value: 42" \
    "Test 1b: get_T_value with u64" \
    "Success! Value: 100" \
    "Test 2: get_i64_value with NULL pointer" \
    "Error: NULL pointer detected" \
    "Test 3: Safe division - 20 / 4" \
    "Result: 5" \
    "Test 4: Safe division - 10 / 0" \
    "Error: Division by zero detected" \
    "Test 5: min_max with i64" \
    "Min: 8, Max: 15" \
    "All Advanced Tests Passed"

if [ $? -ne 0 ]; then
    exit 1
fi

# Test debug.x
compile "debug.x"
if [ $? -ne 0 ]; then
    exit 1
fi
assert_output "debug" "" "" "" \
    "Test: Safe division" \
    "Result tuple created" \
    "Destructured" \
    "Quotient: 5, Error: 0"

if [ $? -ne 0 ]; then
    exit 1
fi

# Test destruct_simple.x
compile "destruct_simple.x"
if [ $? -ne 0 ]; then
    exit 1
fi
assert_output "destruct_simple" "" "" "" \
    "a=10, b=20"

if [ $? -ne 0 ]; then
    exit 1
fi

# Test test_literal.x
compile "test_literal.x"
if [ $? -ne 0 ]; then
    exit 1
fi
assert_output "test_literal" "" "" "" \
    "Value: 5, Code: 1"

if [ $? -ne 0 ]; then
    exit 1
fi

# Cleanup
rm -f "$EXE"
rm -f "debug"
rm -f "destruct_simple"
rm -f "test_literal"
rm -f *.o
rm -f *.asm
rm -f *.ll

echo "✅ All tuple_advanced tests passed!"
