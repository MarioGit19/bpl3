#!/bin/bash
source ../test_utils.sh

# Configuration
SOURCE_FILE="try_catch.x"
INPUT=""
ARGS=""
ENV_VARS=""
EXPECTED=(
"Starting try/catch demo..."
"--- Test 1: Catch MyError ---"
"Throwing MyError..."
"Caught MyError with code: -1"
"--- Test 2: Catch OtherError ---"
"Throwing OtherError..."
"Caught OtherError with msg: Zero is not allowed"
"--- Test 3: No Exception ---"
"Value is good: 10"
"--- Test 4: Multiple Catches (Match First) ---"
"Throwing MyError..."
"Caught MyError: -5"
"--- Test 5: Multiple Catches (Match Second) ---"
"Throwing OtherError..."
"Caught OtherError: Zero is not allowed"
"Done."
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
