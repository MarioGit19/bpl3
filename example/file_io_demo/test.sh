#!/bin/bash
cd "$(dirname "$0")"
source ../test_utils.sh

# Configuration
SOURCE_FILE="file_io_demo.x"
INPUT="" # Input for the program if needed
ARGS="" # Command line arguments
ENV_VARS="" # Environment variables (e.g. "VAR=val")
EXPECTED="--- Starting Extended File I/O Test ---

[1] Basic Write
Written: 'Hello, File I/O World!'

[2] Append Mode
Appended: ' Appended text.'

[3] Read All & Verify
Read content: 'Hello, File I/O World! Appended text.'
SUCCESS: Content verification passed.

[4] Tell & Rewind
Rewind successful, pos = 0
Read 5 bytes: 'Hello'
Tell successful, pos = 5

[5] Binary I/O
Written 5 bytes: 10, 20, 30, 40, 50
Read bytes: SUCCESS: Binary data matches.

[6] Cleanup
Deleted text file.
Deleted binary file.

--- Extended File I/O Test Complete ---"

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
