# Performance Tips

Writing efficient BPL code.

## Memory

- Prefer stack allocation over heap allocation when possible.
- Pass large structs by pointer to avoid copying.

## Loops

- Minimize work inside loops.
- Use efficient algorithms.
