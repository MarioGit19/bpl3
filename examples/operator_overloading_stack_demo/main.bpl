# Demonstration of the stack overflow issue
#
# The recursion path:
#
# 1. main() calls: b + addend
# 2. generateBinary() is called for the + operator
# 3. generateBinary() calls: resolveType(Box<i32>)  <-- To get LLVM type
# 4. resolveType() calls: resolveMonomorphizedType(Box, [i32])
# 5. resolveMonomorphizedType() generates Box_i32 struct
# 6. Generating Box_i32 queues: generateFunction(__add__)
# 7. generateFunction(__add__) needs to generate its body
# 8. The body contains: this.val + other
# 9. Which calls: resolveType(Box<i32>)  <-- SAME TYPE AGAIN!
# 10. Back to step 4 --> INFINITE LOOP
#
# The recursion:
# generateBinary(+) 
#   → resolveType(Box<i32>)
#     → resolveMonomorphizedType()
#       → generateFunction(__add__)
#         → generateStatement(return ...)
#           → generateBinary(+)  <-- RECURSION!
#             → resolveType(Box<i32>)
#               → ... infinite loop

extern printf(fmt: string, ...);

struct Box<T> {
    val: T,
    # THIS METHOD CAUSES THE ISSUE:
    # When we try to use b + addend in main:
    # - CodeGen tries to resolve Box<i32>
    # - This generates Box_i32 struct
    # - Which generates THIS method
    # - Which contains: this.val + other
    # - Which needs Box<i32> again!
    frame __add__(this: *Box<T>, other: T) ret Box<T> {
        local result: Box<T>;
        result.val = this.val + other; # <-- this line causes recursion
        return result;
    }
}

frame main() ret int {
    local b: Box<i32>;
    b.val = 10;
    local addend: i32 = 5;

    # THIS LINE TRIGGERS THE STACK OVERFLOW:
    local b2: Box<i32> = b + addend; # <-- Using the operator

    printf("value: %d\n", b2.val);
    return 0;
}
