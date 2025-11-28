#!/bin/bash
source ../example/test_utils.sh

# Configuration
SOURCE_FILE="test_lib.x"
INPUT=""
ARGS=""
ENV_VARS=""
EXPECTED=(
    "Testing Math..."
    "min(10, 20): 10"
    "max(10, 20): 20"
    "clamp(5, 10, 20): 10"
    "clamp(25, 10, 20): 20"
    "clamp(15, 10, 20): 15"
    "pow(2, 3): 8"
    "gcd(12, 18): 6"
    "lcm(12, 18): 36"
    "Testing String..."
    "strlen('Hello'): 5"
    "strcpy: World"
    "strcat: Hello World"
    "streq('Hello', 'Hello'): 1"
    "streq('Hello', 'World'): 0"
    "to_upper: ABC"
    "atoi('123'): 123"
    "atoi('-456'): -456"
    "Testing Array..."
    "arr[0] (fill 7): 7"
    "arr[4] (fill 7): 7"
    "sum(1..5): 15"
    "arr[0] (reversed): 5"
    "find(3): 2"
    "find(99): -1"
    "Testing Random..."
    "Random OK"
)

# Compile
compile "$SOURCE_FILE"
if [ $? -ne 0 ]; then
    exit 1
fi

# Run Test
EXE="${SOURCE_FILE%.x}"
assert_output "$EXE" "$INPUT" "$ARGS" "$ENV_VARS" "${EXPECTED[@]}"
RES=$?

# Cleanup
rm -f "$EXE"
rm -f *.o
rm -f *.asm

if [ $RES -ne 0 ]; then
    exit 1
fi
