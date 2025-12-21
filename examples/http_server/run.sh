#!/bin/bash
set -e

PORT=${1:-8109}

# Compile BPL to LLVM IR
../../bpl-wrapper.sh main.bpl

# Compile LLVM IR to executable using clang
# We need to link against libc (default)
clang main.ll -o server

echo "Starting server on port $PORT..."
./server $PORT
