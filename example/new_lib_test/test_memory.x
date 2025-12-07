import std_malloc, std_free, std_realloc from "std/memory.x";
import [Console] from "std/io.x";

frame main() {
    call Console.print_str("--- Testing Memory ---\n");

    # Test 1: Basic Malloc
    call Console.print_str("Allocating 100 bytes...\n");
    local ptr1: *u8 = call std_malloc(100);
    if ptr1 == NULL {
        call Console.print_str("Malloc failed!\n");
        return;
    }
    call Console.print_str("Malloc success. Address: ");
    call Console.print_int(cast<u64>(ptr1));
    call Console.println();

    # Write to memory
    ptr1[0] = 'A';
    ptr1[1] = 'B';
    ptr1[2] = 0;
    call Console.print_str("Data in ptr1: ");
    call Console.print_str(ptr1);
    call Console.println();

    # Test 2: Realloc (Grow)
    call Console.print_str("Reallocating to 200 bytes...\n");
    local ptr2: *u8 = call std_realloc(ptr1, 200);
    if ptr2 == NULL {
        call Console.print_str("Realloc failed!\n");
        return;
    }
    call Console.print_str("Realloc success. Address: ");
    call Console.print_int(cast<u64>(ptr2));
    call Console.println();
    call Console.print_str("Data in ptr2 (should be AB): ");
    call Console.print_str(ptr2);
    call Console.println();

    # Test 3: Multiple allocations (Bump allocator check)
    call Console.print_str("Allocating more chunks...\n");
    local ptr3: *u8 = call std_malloc(50);
    local ptr4: *u8 = call std_malloc(50);

    call Console.print_str("ptr3: ");
    call Console.print_int(cast<u64>(ptr3));
    call Console.println();

    call Console.print_str("ptr4: ");
    call Console.print_int(cast<u64>(ptr4));
    call Console.println();

    if cast<u64>(ptr4) > cast<u64>(ptr3) {
        call Console.print_str("Bump allocator working correctly (ptr4 > ptr3)\n");
    } else {
        call Console.print_str("Bump allocator weirdness?\n");
    }

    call std_free(ptr1); # Should be no-op
    call std_free(ptr2);
    call std_free(ptr3);
    call std_free(ptr4);

    call Console.print_str("--- Memory Test Complete ---\n");
}
