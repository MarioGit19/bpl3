#!/bin/bash
# Test script for Array and String struct features
set -e
source ../test_utils.sh
compile array_string_test.x
if [ $? -ne 0 ]; then
    exit 1
fi

assert_output "array_string_test" "" "" "" "Array length: 3
Array pop: 30
Array length after pop: 2
Concat: Hello, World!
Slice: World
Length: 13"

# Cleanup
rm -f array_string_test
rm -f *.o
rm -f *.asm
rm -f *.ll

# Test complex features
compile complex_test.x
if [ $? -ne 0 ]; then
    exit 1
fi

assert_output "complex_test" "" "" "" "String Array Length: 2
First string: Hello
Second string: World
s1 charAt 1: e
s1 indexOf 'l': 2
s1 indexOf 'z': -1
s1 equals s3: 1
s1 equals s2: 0
Modified intArr[0]: 999
Cleared intArr length: 0"

# Cleanup
rm -f complex_test
rm -f *.o
rm -f *.asm
rm -f *.ll

# Test Set (Map) structure
compile set_test.x
if [ $? -ne 0 ]; then
    exit 1
fi

assert_output "set_test" "" "" "" "Map size: 2
Contains Fruits: 1
Contains Vegetables: 1
Contains Cars: 0
Fruits count: 2
Fruit 0: Apple
Fruits count after update: 3
Map size after remove: 1
Contains Vegetables after remove: 0"

# Cleanup
rm -f set_test
rm -f *.o
rm -f *.asm
rm -f *.ll
