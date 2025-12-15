#!/bin/bash
source ../test_utils.sh

# Configuration
SOURCE_FILE="test.x"
INPUT=""
ARGS=""
ENV_VARS=""
EXPECTED="Sum: 30
Counter start: 5
Counter after inc: 6"

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

# --- Complex Test ---

# Configuration
SOURCE_FILE="complex.x"
INPUT=""
ARGS=""
ENV_VARS=""
EXPECTED="Fib(10): 55
Identity: 42
[LOG]: Worker started
Worker ID: 99
Created worker with ID: 99"

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
