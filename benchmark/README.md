# BPL Benchmarks

This directory contains benchmark programs to compare the performance of BPL against other languages like C, Go, and Python.

## Structure

Each benchmark is contained in its own subdirectory (e.g., `loop_to_million`).
Inside each directory, you will find:

- `loop.bpl`: The BPL implementation
- `loop.c`: The C implementation
- `loop.go`: The Go implementation
- `loop.py`: The Python implementation
- `loop.js`: The JavaScript implementation
- `run.sh`: A script to compile and run all implementations and report execution times.

## Running Benchmarks

To run a specific benchmark, navigate to its directory and execute the `run.sh` script:

```bash
cd loop_to_million
./run.sh
```

## Requirements

- `bun` (for running the BPL compiler)
- `gcc` (for C)
- `go` (for Go)
- `python3` (for Python)
- `node` (for JavaScript)
