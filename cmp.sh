#!/bin/bash

SCRIPT_DIR=$(dirname "$0");
echo $SCRIPT_DIR;

bun "$SCRIPT_DIR/index.ts" $*

exit $?;