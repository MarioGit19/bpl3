#!/bin/bash
# BPL3 Compiler Wrapper Script
# This script ensures BPL_HOME is set before running the compiler

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# If BPL_HOME is not set, try to determine it
if [ -z "$BPL_HOME" ]; then
    # Check if we're in /usr/bin (installed via symlink)
    if [ "$(basename "$SCRIPT_DIR")" = "bin" ] && [ -L "$0" ]; then
        # Follow the symlink to find the real installation directory
        REAL_PATH="$(readlink -f "$0")"
        export BPL_HOME="$(dirname "$REAL_PATH")"
    else
        # Assume we're running from the installation directory
        export BPL_HOME="$SCRIPT_DIR"
    fi
fi

# Run the actual compiler binary
exec "$SCRIPT_DIR/bpl" "$@"
