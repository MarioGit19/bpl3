#!/bin/bash
source ../test_utils.sh

# --- Test 1: Complex Structs & Inheritance ---
echo "---------------------------------------------------"
echo "Running Complex Structs & Inheritance Test"
SOURCE_FILE="complex_test.x"
EXPECTED=(
"Testing complex struct exception..."
"Caught ComplexError: id=123, msg=Complex error occurred, data=[10, 20, 30, 40]"
"Complex struct verification passed."
"Testing inheritance exception (expecting NO catch by base)..."
"Caught DerivedError explicitly. (Expected)"
"All tests passed."
)

compile "$SOURCE_FILE"
if [ $? -ne 0 ]; then exit 1; fi

EXE="${SOURCE_FILE%.x}"
assert_output "$EXE" "" "" "" "${EXPECTED[@]}"
if [ $? -ne 0 ]; then exit 1; fi


# --- Test 2: Rethrow ---
echo "---------------------------------------------------"
echo "Running Rethrow Test"
SOURCE_FILE="rethrow_test.x"
EXPECTED=(
"Testing rethrow..."
"Caught error in helper: 500. Rethrowing..."
"Caught rethrown error in main: 500"
"Rethrow verification passed."
)

compile "$SOURCE_FILE"
if [ $? -ne 0 ]; then exit 1; fi

EXE="${SOURCE_FILE%.x}"
assert_output "$EXE" "" "" "" "${EXPECTED[@]}"
if [ $? -ne 0 ]; then exit 1; fi


# --- Test 3: Primitives ---
echo "---------------------------------------------------"
echo "Running Primitive Types Test"
SOURCE_FILE="primitive_test.x"
EXPECTED=(
"Testing u64 throw..."
"Caught u64: 12345"
"Testing string throw..."
"Caught string: Error Message"
"Primitive tests passed."
)

compile "$SOURCE_FILE"
if [ $? -ne 0 ]; then exit 1; fi

EXE="${SOURCE_FILE%.x}"
assert_output "$EXE" "" "" "" "${EXPECTED[@]}"
if [ $? -ne 0 ]; then exit 1; fi


# --- Test 4: Loops ---
echo "---------------------------------------------------"
echo "Running Loop Test"
SOURCE_FILE="loop_test.x"
EXPECTED=(
"Testing throw from loop..."
"Caught from loop: 5"
"Loop throw verification passed."
)

compile "$SOURCE_FILE"
if [ $? -ne 0 ]; then exit 1; fi

EXE="${SOURCE_FILE%.x}"
assert_output "$EXE" "" "" "" "${EXPECTED[@]}"
if [ $? -ne 0 ]; then exit 1; fi

echo "---------------------------------------------------"
echo "All try/catch complex tests passed!"
