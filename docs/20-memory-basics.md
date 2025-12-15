# Memory Basics

BPL provides low-level control over memory, similar to C.

## Stack vs Heap

- **Stack**: Local variables are allocated on the stack. They are automatically deallocated when the function returns.
- **Heap**: Dynamic memory is allocated on the heap using `malloc` and must be freed manually using `free`.

## Pointers

Pointers are used to access memory addresses directly. See [Pointers](15-pointers.md) for more details.
