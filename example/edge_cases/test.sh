#!/bin/bash
source ../test_utils.sh

# Test 1: Bitwise operations
echo "Testing bitwise.x..."
SOURCE_FILE="bitwise.x"
compile "$SOURCE_FILE"
if [ $? -ne 0 ]; then
    exit 1
fi

EXE="${SOURCE_FILE%.x}"
EXPECTED=(
    "--- Bitwise u64 ---"
    "AND: deadbeefcafebabe & ffffffff = cafebabe"
    "OR: deadbeefcafebabe | ffffffff = deadbeefffffffff"
    "XOR: deadbeefcafebabe ^ ffffffff = deadbeef35014541"
    "NOT: ~ffffffff = ffffffff00000000"
    "SHL: 1 << 4 = 16"
    "SHR: 16 >> 2 = 4"
    "--- Bitwise u32 ---"
    "AND: aabbccdd & ffff = ccdd"
    "NOT: ~aabbccdd = 55443322"
    "--- Bitwise u8 ---"
    "AND: aa & f = a"
    "OR: aa | f = af"
)
assert_output "$EXE" "" "" "" "${EXPECTED[@]}"
if [ $? -ne 0 ]; then
    exit 1
fi
rm -f "$EXE" *.o *.asm *.ll

# Test 2: Casting
echo "Testing casting.x..."
SOURCE_FILE="casting.x"
compile "$SOURCE_FILE"
if [ $? -ne 0 ]; then
    exit 1
fi

EXE="${SOURCE_FILE%.x}"
EXPECTED=(
    "--- Casting Tests ---"
    "f64 to u64: 123.456000 -> 123"
    "u64 to f64: 987 -> 987.000000"
    "f32 to f64: 3.140000 -> 3.140000"
    "f64 to f32: 6.280000 -> 6.280000"
    "u64 to u8 (trunc): 1234567890abcdef -> ef"
)
assert_output "$EXE" "" "" "" "${EXPECTED[@]}"
if [ $? -ne 0 ]; then
    exit 1
fi
rm -f "$EXE" *.o *.asm *.ll

# Test 3: Control Flow
echo "Testing control_flow.x..."
SOURCE_FILE="control_flow.x"
compile "$SOURCE_FILE"
if [ $? -ne 0 ]; then
    exit 1
fi

EXE="${SOURCE_FILE%.x}"
EXPECTED=(
    "--- Control Flow ---"
    "Outer loop i=0"
    "  Inner loop j=0"
    "  Inner loop j=2"
    "Outer loop i=1"
    "  Inner loop j=0"
    "  Inner loop j=2"
    "Outer loop i=2"
    "  Inner loop j=0"
    "  Inner loop j=2"
)
assert_output "$EXE" "" "" "" "${EXPECTED[@]}"
if [ $? -ne 0 ]; then
    exit 1
fi
rm -f "$EXE" *.o *.asm *.ll
