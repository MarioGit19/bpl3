import malloc, free, realloc from "std/memory.x";
import print_str, print_int, println from "std/io.x";

frame main() {
    call print_str("--- Testing Memory ---\n");

    # Test 1: Basic Malloc
    call print_str("Allocating 100 bytes...\n");
    local ptr1: *u8 = call malloc(100);
    if ptr1 == NULL {
        call print_str("Malloc failed!\n");
        return;
    }
    call print_str("Malloc success. Address: ");
    call print_int(cast<u64>(ptr1));
    call println();

    # Write to memory
    ptr1[0] = 'A';
    ptr1[1] = 'B';
    ptr1[2] = 0;
    call print_str("Data in ptr1: ");
    call print_str(ptr1);
    call println();

    # Test 2: Realloc (Grow)
    call print_str("Reallocating to 200 bytes...\n");
    local ptr2: *u8 = call realloc(ptr1, 200);
    if ptr2 == NULL {
        call print_str("Realloc failed!\n");
        return;
    }
    call print_str("Realloc success. Address: ");
    call print_int(cast<u64>(ptr2));
    call println();
    call print_str("Data in ptr2 (should be AB): ");
    call print_str(ptr2);
    call println();

    # Test 3: Multiple allocations (Bump allocator check)
    call print_str("Allocating more chunks...\n");
    local ptr3: *u8 = call malloc(50);
    local ptr4: *u8 = call malloc(50);

    call print_str("ptr3: ");
    call print_int(cast<u64>(ptr3));
    call println();

    call print_str("ptr4: ");
    call print_int(cast<u64>(ptr4));
    call println();

    if cast<u64>(ptr4) > cast<u64>(ptr3) {
        call print_str("Bump allocator working correctly (ptr4 > ptr3)\n");
    } else {
        call print_str("Bump allocator weirdness?\n");
    }

    call free(ptr1); # Should be no-op
    call free(ptr2);
    call free(ptr3);
    call free(ptr4);

    call print_str("--- Memory Test Complete ---\n");
}
