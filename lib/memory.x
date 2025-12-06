import sys_mmap, PROT_READ, PROT_WRITE, MAP_PRIVATE, MAP_ANONYMOUS from "syscalls.x";

global HEAP_START: *u8 = NULL;
global HEAP_PTR: *u8 = NULL;
global HEAP_END: *u8 = NULL;
global HEAP_SIZE: u64 = 1024 * 1024 * 1024; # 1GB

frame init_heap() {
    if HEAP_START != NULL {
        return;
    }
    local prot: u64 = call PROT_READ() | call PROT_WRITE();
    local flags: u64 = call MAP_PRIVATE() | call MAP_ANONYMOUS();
    HEAP_START = call sys_mmap(NULL, HEAP_SIZE, prot, flags, cast<u64>(-1), 0);
    HEAP_PTR = HEAP_START;
    HEAP_END = HEAP_START + HEAP_SIZE;
}

frame malloc(size: u64) ret *u8 {
    if HEAP_START == NULL {
        call init_heap();
    }

    # Align size to 8 bytes
    if size % 8 != 0 {
        size = size + (8 - size % 8);
    }

    # Add header size (8 bytes for size)
    local total_size: u64 = size + 8;

    if HEAP_PTR + total_size > HEAP_END {
        return NULL;
    }

    local header_ptr: *u64 = cast<*u64>(HEAP_PTR);
    header_ptr[0] = size; # Store size

    local user_ptr: *u8 = HEAP_PTR + 8;
    HEAP_PTR = HEAP_PTR + total_size;

    return user_ptr;
}

frame free(ptr: *u8) {
    # No-op for bump allocator
}

frame realloc(ptr: *u8, new_size: u64) ret *u8 {
    if ptr == NULL {
        return call malloc(new_size);
    }

    local header_ptr: *u64 = cast<*u64>(ptr - 8);
    local old_size: u64 = header_ptr[0];

    if new_size <= old_size {
        return ptr;
    }

    local new_ptr: *u8 = call malloc(new_size);
    if new_ptr == NULL {
        return NULL;
    }

    # Copy old data
    local i: u64 = 0;
    loop {
        if i >= old_size {
            break;
        }
        new_ptr[i] = ptr[i];
        i = i + 1;
    }

    return new_ptr;
}

export malloc;
export free;
export realloc;
