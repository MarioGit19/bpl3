#!/bin/bash
# BPL3 Compiler Wrapper Script
# This script ensures BPL_HOME is set before running the compiler

# Get the directory where this script is located (resolving symlinks)
if [ -L "$0" ]; then
    # If this script is a symlink, resolve it to the real path
    REAL_SCRIPT="$(readlink -f "$0")"
    SCRIPT_DIR="$(dirname "$REAL_SCRIPT")"
else
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi

# If BPL_HOME is not set, set it to the script directory
if [ -z "$BPL_HOME" ]; then
    export BPL_HOME="$SCRIPT_DIR"
fi

# Run the actual compiler binary from the installation directory
exec "$BPL_HOME/bpl" "$@"
