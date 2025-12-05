#!/bin/bash
source ../test_utils.sh
# Configuration
SOURCE_FILE="operators.x"
INPUT=""
ARGS=""
ENV_VARS=""
EXPECTED=(
    "a = 10, b = 3"
    "a + b = 13"
    "a - b = 7"
    "a * b = 30"
    "a % b = 1"
    "a & b = 2"
    "a | b = 11"
    "a ^ b = 9"
    "a << 1 = 20"
    "a >> 1 = 5"
    "a == b : 0"
    "a != b : 1"
    "a > b  : 1"
    "a < b  : 0"
    "(a > 5) && (b < 5) : 1"
    "(a < 5) || (b < 5) : 1"
    "!a : 0"
    "c += 5 -> 15"
    "c *= 2 -> 30"
)

# Compile
compile "$SOURCE_FILE"
if [ $? -ne 0 ]; then
    exit 1
fi

# Run Test
EXE="${SOURCE_FILE%.x}"
assert_output "$EXE" "$INPUT" "$ARGS" "$ENV_VARS" "${EXPECTED[@]}"
if [ $? -ne 0 ]; then
    exit 1
fi

# Cleanup
rm -f "$EXE"
rm -f *.o
rm -f *.asm
rm -f *.ll
