#!/bin/bash
# Test script for Array and String struct features
source ../test_utils.sh

# Test 1: Basic Array and String operations
SOURCE_FILE="array_string_test.x"
compile "$SOURCE_FILE"
if [ $? -ne 0 ]; then
    exit 1
fi

EXE="${SOURCE_FILE%.x}"
assert_output "$EXE" "" "" "" "Array length: 3" "Array pop: 30" "Array length after pop: 2" "Concat: Hello, World!" "Slice: World" "Length: 13"
if [ $? -ne 0 ]; then
    exit 1
fi

# Cleanup
rm -f "$EXE"
rm -f *.o *.asm *.ll

# Test 2: Complex features
SOURCE_FILE="complex_test.x"
compile "$SOURCE_FILE"
if [ $? -ne 0 ]; then
    exit 1
fi

EXE="${SOURCE_FILE%.x}"
assert_output "$EXE" "" "" "" "String Array Length: 2" "First string: Hello" "Second string: World" "s1 charAt 1: e" "s1 indexOf 'l': 2" "s1 indexOf 'z': -1" "s1 equals s3: 1" "s1 equals s2: 0" "Modified intArr[0]: 999" "Cleared intArr length: 0"
if [ $? -ne 0 ]; then
    exit 1
fi

# Cleanup
rm -f "$EXE"
rm -f *.o *.asm *.ll

# Test 3: Set (Map) structure
SOURCE_FILE="set_test.x"
compile "$SOURCE_FILE"
if [ $? -ne 0 ]; then
    exit 1
fi

EXE="${SOURCE_FILE%.x}"
assert_output "$EXE" "" "" "" "=== Demonstrating Set (unique values) ===" "Map size: 2" "Contains Fruits: 1" "Contains Vegetables: 1" "Contains Cars: 0" "Fruits count: 2" "Fruit 0: Apple" "Fruits count after update: 3" "Map size after remove: 1" "Contains Vegetables after remove: 0"
if [ $? -ne 0 ]; then
    exit 1
fi

# Cleanup
rm -f "$EXE"
rm -f *.o *.asm *.ll
