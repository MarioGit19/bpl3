#!/bin/bash
source ../test_utils.sh

# Configuration
SOURCE_FILE="stack_trace.x"

# Compile
compile "$SOURCE_FILE" "--stack-trace"
if [ $? -ne 0 ]; then
    exit 1
fi

# Run Test
EXE="${SOURCE_FILE%.x}"
./"$EXE" > result.txt 2>&1
EXIT_CODE=$?

# Check if stack trace is present
if grep -q "Stack trace:" result.txt && grep -q "baz" result.txt && grep -q "bar" result.txt && grep -q "foo" result.txt && grep -q "stack_trace.x" result.txt; then
    echo "Stack trace test passed"
    rm result.txt "$EXE"
    exit 0
else
    echo "Stack trace test failed"
    cat result.txt
    rm result.txt "$EXE"
    exit 1
fi
