#!/bin/bash
source ../test_utils.sh
# Configuration
SOURCE_FILE="main.x"
INPUT=""
ARGS=""
ENV_VARS=""
EXPECTED=("=== BPL Showcase ===" "--- Math & Structs ---" "v1: (1.00000000000000000, 2.00000000000000000, 3.00000000000000000)" "v2: (4.00000000000000000, 5.00000000000000000, 6.00000000000000000)" "v1 + v2: (5.00000000000000000, 7.00000000000000000, 9.00000000000000000)" "v1 . v2: 32.00000000000000000" "Normalized v3: (0.40160966445124944, 0.56225353023174920, 0.72289739601224896)" "--- Strings ---" "StringBuilder result: Hello, World! This is BPL." "--- Data Structures ---" "Popping items:" "  Item 3" "  Item 2" "  Item 1" "--- Virtual Machine ---" "VM Output: 30" "=== Showcase Complete ===")

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