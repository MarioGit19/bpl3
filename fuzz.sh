#!/bin/bash

# Default iterations
ITERATIONS=${1:-5000}

echo "Running fuzz tests with $ITERATIONS iterations..."
FUZZ_ITERATIONS=$ITERATIONS bun test tests/fuzz.test.ts
