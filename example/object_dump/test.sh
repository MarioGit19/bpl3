#!/bin/bash
cd "$(dirname "$0")"
source ../test_utils.sh

# Configuration
SOURCE_FILE="object_dump.x"
INPUT=""
ARGS=""
ENV_VARS=""
EXPECTED="--- Object Dump/Restore Test ---
Original Player: ID=12345, Level=42, Health=85, Score=999999
Saving player to file...
Save successful.
Loading player from file...
Load successful.
Restored Player: ID=12345, Level=42, Health=85, Score=999999
SUCCESS: Restored object matches original.
--- Test Complete ---"

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
