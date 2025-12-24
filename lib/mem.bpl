# Memory management utilities

struct Memory {
    # Initialize the memory pointed to by ptr.
    # This sets the internal null bit to 1, marking the object as valid.
    # This is an intrinsic function handled by the compiler.
    frame init<T>(_ptr: *T) {
        # Intrinsic - body ignored/replaced by compiler
    }
}

export [Memory];
