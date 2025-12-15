#!/bin/bash
source ../test_utils.sh

# Configuration
SOURCE_FILE="test.x"

# Compile with --stack-trace
compile "$SOURCE_FILE" "--stack-trace"
if [ $? -ne 0 ]; then
    exit 1
fi

# Run Test
EXE="${SOURCE_FILE%.x}"
./"$EXE" > result.txt
EXIT_CODE=$?

# Check output
if grep -q "Printing stack trace directly:" result.txt && \
   # grep -q "Getting stack trace as string:" result.txt && \
   grep -q "func_c" result.txt && \
   grep -q "func_b" result.txt && \
   grep -q "func_a" result.txt && \
   grep -q "main" result.txt; then
    echo "Stack trace API test passed"
    rm result.txt "$EXE"
    exit 0
else
    echo "Stack trace API test failed"
    cat result.txt
    # rm result.txt "$EXE"
    exit 1
fi
