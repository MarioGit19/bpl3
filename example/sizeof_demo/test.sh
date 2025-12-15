#!/bin/bash
source ../test_utils.sh
# Configuration
SOURCE_FILE="sizeof_demo.x"
INPUT=""
ARGS=""
ENV_VARS=""
EXPECTED="sizeof(u8) = 1
sizeof(u16) = 2
sizeof(u32) = 4
sizeof(u64) = 8
sizeof(*u64) = 8
Allocated 40 bytes for 10 u32 elements
arr[0] = 100, arr[9] = 900"

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
