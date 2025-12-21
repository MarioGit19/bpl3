#!/bin/bash

# Colors
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${BOLD}Starting all benchmarks...${NC}\n"

# Find all directories containing run.sh
for dir in "$SCRIPT_DIR"/*/; do
    if [ -f "${dir}run.sh" ]; then
        dirname=$(basename "$dir")
        echo -e "${BLUE}==========================================================${NC}"
        echo -e "${BOLD}Running benchmark: $dirname${NC}"
        echo -e "${BLUE}==========================================================${NC}"
        
        # Run the benchmark in a subshell to preserve current directory
        (cd "$dir" && ./run.sh)
        
        echo ""
    fi
done

echo -e "${BOLD}All benchmarks completed.${NC}"
