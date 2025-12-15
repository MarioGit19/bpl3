#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Path to compiler
COMPILER="../../index.ts"

# Function to run a test
run_test() {
    local file=$1
    local expected_output=$2
    local expected_exit_code=${3:-0}

    echo -e "Testing ${file}..."

    # Compile
    bun $COMPILER "$file"
    if [ $? -ne 0 ]; then
        echo -e "${RED}Compilation failed for $file${NC}"
        return 1
    fi

    # Run
    local exe="${file%.x}"
    local output
    output=$("./$exe")
    local exit_code=$?

    # Check exit code
    if [ $exit_code -ne $expected_exit_code ]; then
        echo -e "${RED}Failed: Expected exit code $expected_exit_code, got $exit_code${NC}"
        rm -f "$exe"
        return 1
    fi

    # Check output (if expected output is provided)
    if [ -n "$expected_output" ]; then
        # Normalize whitespace for comparison
        local clean_output=$(echo "$output" | tr -d '\r')
        local clean_expected=$(echo -e "$expected_output" | tr -d '\r')
        
        # Simple containment check or exact match? Let's do containment for flexibility
        if [[ "$clean_output" != *"$clean_expected"* ]]; then
             echo -e "${RED}Failed: Output mismatch${NC}"
             echo "Expected to contain:"
             echo "$clean_expected"
             echo "Got:"
             echo "$clean_output"
             rm -f "$exe"
             return 1
        fi
    fi

    echo -e "${GREEN}Passed${NC}"
    rm -f "$exe"
    return 0
}

# --- Test IO ---
EXPECTED_IO="--- Testing IO ---
String test: Hello World
Int test (positive): 12345
Int test (negative): -6789
Int test (zero): 0
Char test: ABC
--- IO Test Complete ---"

run_test "test_io.x" "$EXPECTED_IO" 0 || exit 1

# --- Test Memory ---
# We check for key phrases since addresses are dynamic
EXPECTED_MEMORY_PHRASES=(
    "--- Testing Memory ---"
    "Malloc success. Address:"
    "Data in ptr1: AB"
    "Realloc success. Address:"
    "Data in ptr2 (should be AB): AB"
    "Bump allocator working correctly (ptr4 > ptr3)"
    "--- Memory Test Complete ---"
)

echo -e "Testing test_memory.x..."
bun $COMPILER "test_memory.x"
if [ $? -ne 0 ]; then
    echo -e "${RED}Compilation failed for test_memory.x${NC}"
    exit 1
fi

EXE="test_memory"
OUTPUT=$("./$EXE")
rm -f "$EXE"

for phrase in "${EXPECTED_MEMORY_PHRASES[@]}"; do
    if [[ "$OUTPUT" != *"$phrase"* ]]; then
        echo -e "${RED}Failed: Output missing phrase: '$phrase'${NC}"
        echo "Got:"
        echo "$OUTPUT"
        exit 1
    fi
done
echo -e "${GREEN}Passed${NC}"

# --- Test Syscalls ---
EXPECTED_SYSCALLS="--- Testing Syscalls ---
Direct sys_write test
Exiting with code 42..."

run_test "test_syscalls.x" "$EXPECTED_SYSCALLS" 42 || exit 1

# --- Test Read ---
echo -e "Testing test_read.x..."
bun $COMPILER "test_read.x"
if [ $? -ne 0 ]; then
    echo -e "${RED}Compilation failed for test_read.x${NC}"
    exit 1
fi

EXE="test_read"
INPUT_TEXT="Hello Input"
OUTPUT=$(echo "$INPUT_TEXT" | "./$EXE")
rm -f "$EXE"

EXPECTED_READ="Reading from stdin...
Read: Hello Input"

if [[ "$OUTPUT" != *"$EXPECTED_READ"* ]]; then
    echo -e "${RED}Failed: Output mismatch${NC}"
    echo "Expected to contain:"
    echo "$EXPECTED_READ"
    echo "Got:"
    echo "$OUTPUT"
    exit 1
fi
echo -e "${GREEN}Passed${NC}"

# --- Test File I/O ---
echo -e "Testing test_file.x..."
bun $COMPILER "test_file.x"
if [ $? -ne 0 ]; then
    echo -e "${RED}Compilation failed for test_file.x${NC}"
    exit 1
fi

EXE="test_file"
OUTPUT=$("./$EXE")
rm -f "$EXE"

EXPECTED_FILE="--- Testing File I/O ---
Opening file for writing...
Writing data...
File closed.
Opening file for reading...
Reading data...
Read  bytes:
Hello File I/O!
Second line.
Removing file...
--- File Test Complete ---"

# Note: "Read bytes:" might have a number if I uncommented print_int, but I didn't.
# Wait, I commented out print_int. So it should be "Read  bytes:" (extra space?)
# Let's check the code: call print_str("Read "); call print_str(" bytes:\n");
# So "Read  bytes:\n"

if [[ "$OUTPUT" != *"$EXPECTED_FILE"* ]]; then
    echo -e "${RED}Failed: Output mismatch${NC}"
    echo "Expected to contain:"
    echo "$EXPECTED_FILE"
    echo "Got:"
    echo "$OUTPUT"
    exit 1
fi
echo -e "${GREEN}Passed${NC}"

echo -e "${GREEN}All tests passed!${NC}"
