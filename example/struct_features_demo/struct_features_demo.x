import [Console] from "std/io.x";

struct Vector3 {
    x: u64,
    y: u64,
    z: u64,
}

# Feature 1: Pass by Value
# This function receives a copy of v. Modifications here do NOT affect the caller.
frame modifyVector(v: Vector3) {
    call Console.log("  [Inside modifyVector] Received: (", v.x, ", ", v.y, ", ", v.z, ")");
    v.x = 999;
    v.y = 999;
    v.z = 999;
    call Console.log("  [Inside modifyVector] Modified local copy to: (", v.x, ", ", v.y, ", ", v.z, ")");
}

# Feature 2: Return by Value
# This function creates a local struct and returns it by value.
frame createVector(x: u64, y: u64, z: u64) ret Vector3 {
    local v: Vector3 = {x: x, y: y, z: z};
    call Console.log("  [Inside createVector] Created: (", v.x, ", ", v.y, ", ", v.z, ")");
    return v;
}

frame main() ret u8 {
    call Console.log("=== DEMO: Struct Pass-by-Value and Return-by-Value ===\n");

    # 1. Demonstrate Pass by Value
    call Console.log("1. Testing Pass by Value: ");
    local myVec: Vector3 = {x: 10, y: 20, z: 30};

    call Console.log("  [Main] Original before call: (", myVec.x, ", ", myVec.y, ", ", myVec.z, ")");
    call modifyVector(myVec);
    call Console.log("  [Main] Original after call: (", myVec.x, ", ", myVec.y, ", ", myVec.z, ") (Should be unchanged)");

    call Console.log();

    # 2. Demonstrate Return by Value
    call Console.log("2. Testing Return by Value: ");
    local newVec: Vector3 = call createVector(100, 200, 300);
    call Console.log("  [Main] Received from function: (", newVec.x, ", ", newVec.y, ", ", newVec.z, ")");

    return 0;
}
