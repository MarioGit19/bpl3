# Test basic Array<T> operations without operators

import [Array] from "../../lib/array.bpl";
extern printf(fmt: string, ...);

frame main() ret int {
    # Create an integer array
    local arr: Array<i32> = Array<i32>.new(5);

    # Test basic push
    printf("Testing basic push:\n");
    &arr.push(10);
    &arr.push(20);
    &arr.push(30);

    printf("Array length after pushes: %d\n", arr.len());
    printf("Elements: %d, %d, %d\n", arr.get(0), arr.get(1), arr.get(2));

    # Cleanup
    &arr.destroy();

    printf("\n=== Basic array test passed! ===\n");
    return 0;
}
