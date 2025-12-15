# Test function generics with explicit type arguments
import [Console] from "std/io.x";

# Generic identity function
frame identity(x: T) ret T {
    return x;
}

# Generic swap function (no return type)
frame swap(a: T, b: U) {
    call Console.log("Before swap: a=", a, "ld, b=", b);
    local temp: T = a;
    # Note: In a real implementation, we'd return both values
    # For demo, just print them
    call Console.log("After swap would exchange values");
}

# Generic max function for integers
frame max(a: T, b: T) ret T {
    if a > b {
        return a;
    }
    return b;
}

frame main() ret i32 {
    # Test identity with different types
    local x: u64 = call identity(42);
    local y: i32 = call identity(-10);
    local z: u8 = call identity(255);

    call Console.log("identity<u64>(42) = ", x);
    call Console.log("identity<i32>(-10) = ", y);
    call Console.log("identity<u8>(255) = ", z);

    # Test max with different types
    local maxU64: u64 = call max(100, 200);
    local maxI32: i32 = call max(-50, 30);

    call Console.log("max<u64>(100, 200) = ", maxU64);
    call Console.log("max<i32>(-50, 30) = ", maxI32);

    # Test swap
    call swap(1000, -500);

    return 0;
}
