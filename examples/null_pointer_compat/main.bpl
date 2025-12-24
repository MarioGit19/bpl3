extern printf(fmt: string, ...) ret int;
extern malloc(size: long) ret *void;
extern free(ptr: *void);

struct User {
    id: int,
    name: string,
}

struct Item {
    value: int,
}

# Test 1: nullptr assigned to various pointer types (including struct pointers)
frame testNullptrPointers() {
    printf("== Test 1: nullptr for all pointers ==\n");
    local p1: *int = nullptr;
    local p2: *User = nullptr;
    local p3: *void = nullptr;
    local p4: string = nullptr;
    local p5: *Item = nullptr;
    printf("nullptr for all pointers: OK\n");
}

# Test 2: void pointer from malloc assigned to typed pointers
frame testVoidToTyped() {
    printf("== Test 2: void* to typed pointers ==\n");
    local voidPtr: *void = malloc(100);
    local intPtr: *int = voidPtr;
    local userPtr: *User = voidPtr;
    local charPtr: string = voidPtr;
    free(voidPtr);
    printf("void* to typed pointers: OK\n");
}

# Test 3: typed pointers assigned to void pointer
frame testTypedToVoid() {
    printf("== Test 3: typed pointers to void* ==\n");
    local user: User = User { id: 42, name: "test" };
    local item: Item = Item { value: 99 };

    local userPtr: *User = &user;
    local itemPtr: *Item = &item;

    local voidPtr1: *void = userPtr;
    local voidPtr2: *void = itemPtr;
    printf("typed pointers to void*: OK\n");
}

# Test 4: void pointer in function parameters
frame acceptsVoidPtr(ptr: *void) {
    printf("void* param accepted: OK\n");
}

frame testVoidParam() {
    printf("== Test 4: void* parameters ==\n");
    local user: User = User { id: 1, name: "alice" };
    local userPtr: *User = &user;
    acceptsVoidPtr(userPtr);
}

# Test 5: typed pointer from void pointer function
frame returnsVoidPtr() ret *void {
    return malloc(50);
}

frame testVoidReturn() {
    printf("== Test 6: void* return values ==\n");
    local voidPtr: *void = returnsVoidPtr();
    local intPtr: *int = voidPtr;
    free(voidPtr);
    printf("void* return: OK\n");
}

# Test 6: malloc pattern (common use case)
frame testMallocPattern() {
    printf("== Test 6: malloc pattern ==\n");
    local userPtr: *User = malloc(sizeof(User));
    userPtr.id = 100;
    userPtr.name = "malloc'd";
    printf("malloc user: id=%d\n", userPtr.id);
    free(userPtr);
}

# Test 7: null checks
frame testNullChecks() {
    printf("== Test 7: null checks ==\n");
    local ptr: *int = nullptr;
    if (ptr == nullptr) {
        printf("nullptr check: OK\n");
    }
    local ptr2: *User = nullptr;
    if (ptr2 == nullptr) {
        printf("struct pointer null check: OK\n");
    }
}

frame main() ret int {
    printf("=== Null/Pointer Compatibility Tests ===\n");
    testNullptrPointers();
    testVoidToTyped();
    testTypedToVoid();
    testVoidParam();
    testVoidReturn();
    testMallocPattern();
    testNullChecks();
    printf("=== All tests passed ===\n");
    return 0;
}
