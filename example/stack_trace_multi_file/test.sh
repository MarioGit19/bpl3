#!/bin/bash
source ../test_utils.sh

# Configuration
SOURCE_FILE="main.x"

# Compile
compile "$SOURCE_FILE" "--stack-trace"
if [ $? -ne 0 ]; then
    exit 1
fi

# Run Test
EXE="${SOURCE_FILE%.x}"
./"$EXE" > result.txt 2>&1
EXIT_CODE=$?

# Check if stack trace is present and correct
if grep -q "Stack trace:" result.txt && \
   grep -q "func_b" result.txt && grep -q "./lib_b.x" result.txt && \
   grep -q "func_a" result.txt && grep -q "./lib_a.x" result.txt && \
   grep -q "main" result.txt && grep -q "main.x" result.txt && \
   grep -qP "\tat " result.txt; then
    echo "Multi-file stack trace test passed"
    rm result.txt "$EXE"
    exit 0
else
    echo "Multi-file stack trace test failed"
    cat result.txt
    rm result.txt "$EXE"
    exit 1
fi
