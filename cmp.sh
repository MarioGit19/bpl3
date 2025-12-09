#!/bin/bash

SCRIPT_DIR=$(dirname "$0");

FILENAME=$(echo "$1" | sed 's/\.x$/.ll/' | sed 's/\.bpl$/.ll/');

bun "$SCRIPT_DIR/index.ts" $1
if [ $? -ne 0 ]; then
    exit 1;
fi
lli "$SCRIPT_DIR/$FILENAME"
EXIT_CODE=$?;
echo "Program exited with code $EXIT_CODE";
exit $EXIT_CODE;