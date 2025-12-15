#!/bin/bash
source ../test_utils.sh

# Configuration
SOURCE_FILE="tuple_verification.x"
EXE="${SOURCE_FILE%.x}"

# Compile
compile "$SOURCE_FILE"
if [ $? -ne 0 ]; then
    exit 1
fi

# Run Test
assert_output "$EXE" "" "" "" \
    "=== Tuple Verification ===" \
    "1. Testing Value Semantics..." \
    "✅ PASS: Original tuple unchanged (Value Type)" \
    "2. Testing Element Access..." \
    "✅ PASS: Element access .0 and .1 working" \
    "3. Testing Destructuring..." \
    "✅ PASS: Destructuring with explicit types working" \
    "4. Testing Number Literals..." \
    "✅ PASS: Number literals accepted as i64" \
    "5. Testing Integer Division..." \
    "✅ PASS: Integer division // working in tuples" \
    "6. Testing Pointer Access..." \
    "✅ PASS: Accessing element via pointer (ptr.0) works"

if [ $? -ne 0 ]; then
    exit 1
fi

# Cleanup
rm -f "$EXE"
rm -f *.o
rm -f *.asm
rm -f *.ll

echo "✅ All tuple_verification tests passed!"
