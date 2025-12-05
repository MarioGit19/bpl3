#!/bin/bash
source ../test_utils.sh

# Configuration
SOURCE_FILE="dynamic_array.x"
INPUT=""
ARGS=""
ENV_VARS=""
EXPECTED="Array length: 5
Array capacity: 8
First element: 10
Last element: 50
After growth - length: 20, capacity: 32
Element at index 10: 100
Element at index 15: 150"

# Compile
compile "$SOURCE_FILE"
if [ $? -ne 0 ]; then
    exit 1
fi

# Run Test
EXE="${SOURCE_FILE%.x}"
assert_output "$EXE" "$INPUT" "$ARGS" "$ENV_VARS" "$EXPECTED"
if [ $? -ne 0 ]; then
    exit 1
fi

# Cleanup
rm -f "$EXE"
