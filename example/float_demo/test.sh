#!/bin/bash
source ../test_utils.sh
# Configuration
SOURCE_FILE="float_demo.x"
INPUT=""
ARGS=""
ENV_VARS=""
EXPECTED=(
    "--- Basic Operations ---"
    "f64 mul: 6.28000000000000024, div: 1.57000000000000008"
    "f32 add: 4.00000000000000000, sub: 1.00000000000000000"
    ""
    "--- Function Calls ---"
    "add_f64(10.5, 20.5): 31.00000000000000000"
    ""
    "--- Arrays ---"
    "Array: [1.10000000000000008, 2.20000000000000016, 3.29999999999999984]"
    ""
    "--- Structs ---"
    "Point(5.00000000000000000, 10.00000000000000000)"
    "Vector3: (1.00000000000000000, 2.00000000000000000, 3.00000000000000000)"
    ""
    "--- Complex Calculation ---"
    "Point distance squared: 125.00000000000000000"
    "--- Arithmetic & Assignments ---"
    "10.0 += 5.0 -> 15.00000000000000000"
    "15.0 -= 2.5 -> 12.50000000000000000"
    "12.5 *= 2.0 -> 25.00000000000000000"
    "25.0 /= 5.0 -> 5.00000000000000000"
    ""
    "--- Mixed Types ---"
    "2.5 + 10 = 12.50000000000000000"
    "10 + 2.5 = 12.50000000000000000"
    "1.5 (f32) + 2.5 (f64) = 4.00000000000000000"
    ""
    "--- Comparisons ---"
    "10.5 == 10.5: true"
    "10.5 != 20.0: true"
    "10.5 < 20.0: true"
    "20.0 > 10.5: true"
    ""
    "--- Many Arguments (Registers) ---"
    "Sum: 36.00000000000000000"
    ""
    "--- Negative Numbers ---"
    "Negative: -5.50000000000000000"
    "Abs val check: is negative"
    ""
    "--- Edge Cases ---"
    "0.0: 0.00000000000000000, -0.0: -0.00000000000000000"
    "1.0 / 0.0 = inf"
    "nan"
    "0.1 + 0.2 = 0.30000000000000004"
)

# Compile
compile "$SOURCE_FILE"
if [ $? -ne 0 ]; then
    exit 1
fi

# Run Test
EXE="${SOURCE_FILE%.x}"
assert_output "$EXE" "$INPUT" "$ARGS" "$ENV_VARS" "${EXPECTED[@]}"
if [ $? -ne 0 ]; then
    exit 1
fi

# Cleanup
rm -f "$EXE"
rm -f *.o
rm -f *.asm
rm -f *.ll
