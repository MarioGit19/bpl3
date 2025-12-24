#!/bin/bash
set -e

# Ensure we are in the project root
cd "$(dirname "$0")/../.."

echo "Running Documentation Generator Test..."

# Clean previous output
rm -f docs_demo_output.md

# Run the docs command
bun index.ts docs examples/docs_demo/main.bpl -o docs_demo_output.md

# Check if file exists
if [ ! -f docs_demo_output.md ]; then
    echo "Error: Output file docs_demo_output.md was not created."
    exit 1
fi

# Check for expected content
if ! grep -q "# Module: main.bpl" docs_demo_output.md; then
    echo "Error: Output missing main module header."
    exit 1
fi

if ! grep -q "## Structs" docs_demo_output.md; then
    echo "Error: Output missing Structs section."
    exit 1
fi

if ! grep -q "Game Engine" docs_demo_output.md; then
    echo "Error: Output missing documentation content."
    exit 1
fi

echo "Documentation generation successful!"
rm docs_demo_output.md
exit 0
