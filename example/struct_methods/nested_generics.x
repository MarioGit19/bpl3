# Test nested structs with nested generics and methods

import [Console] from "std/io.x";

# Inner generic struct with methods
struct Inner<T> {
    value: T,
    multiplier: i32,

    frame getValue() ret T {
        return this.value;
    }

    frame setValue(v: T) {
        this.value = v;
    }

    frame getMultiplier() ret i32 {
        return this.multiplier;
    }

    frame setMultiplier(m: i32) {
        this.multiplier = m;
    }
}

# Outer generic struct containing inner generic struct
struct Outer<T> {
    inner: Inner<T>,
    count: i32,

    frame getCount() ret i32 {
        return this.count;
    }

    frame incrementCount() {
        this.count = this.count + 1;
    }

    frame getInnerMultiplier() ret i32 {
        return this.inner.multiplier;
    }

    frame setInnerMultiplier(m: i32) {
        this.inner.multiplier = m;
    }
}

# Container with two different generic types
struct Container<A, B> {
    first: Inner<A>,
    second: Inner<B>,

    frame getFirstMultiplier() ret i32 {
        return this.first.multiplier;
    }

    frame getSecondMultiplier() ret i32 {
        return this.second.multiplier;
    }

    frame swapMultipliers() {
        local temp: i32 = this.first.multiplier;
        this.first.multiplier = this.second.multiplier;
        this.second.multiplier = temp;
    }
}

# Wrapper for triple nesting
struct Wrapper<T> {
    outer: Outer<T>,
    id: i32,

    frame getId() ret i32 {
        return this.id;
    }

    frame getOuterCount() ret i32 {
        return this.outer.count;
    }

    frame incrementOuterCount() {
        this.outer.count = this.outer.count + 1;
    }

    frame getInnerMultiplier() ret i32 {
        return this.outer.inner.multiplier;
    }
}

frame main() ret i32 {
    # Test 1: Inner<i32> - basic generic methods
    call Console.log("=== Test 1: Inner<i32> ===");
    local inner1: Inner<i32>;
    inner1.value = 42;
    inner1.multiplier = 2;

    local val1: i32 = call inner1.getValue();
    call Console.log("Inner value: ", val1);

    call inner1.setValue(100);
    local val2: i32 = call inner1.getValue();
    call Console.log("After setValue(100): ", val2);

    local mult1: i32 = call inner1.getMultiplier();
    call Console.log("Multiplier: ", mult1);

    # Test 2: Inner<i64>
    call Console.log("\n=== Test 2: Inner<i64> ===");
    local inner2: Inner<i64>;
    inner2.value = 9999;
    inner2.multiplier = 5;

    local val3: i64 = call inner2.getValue();
    call Console.log("Inner value (i64): ", val3);

    call inner2.setMultiplier(10);
    local mult2: i32 = call inner2.getMultiplier();
    call Console.log("After setMultiplier(10): ", mult2);

    # Test 3: Outer<i32> with nested Inner<i32>
    call Console.log("\n=== Test 3: Outer<i32> with nested Inner<i32> ===");
    local outer1: Outer<i32>;
    outer1.inner.value = 42;
    outer1.inner.multiplier = 2;
    outer1.count = 0;

    # Access inner value directly
    call Console.log("Inner value: ", outer1.inner.value);

    # Call outer methods that access inner fields
    local mult3: i32 = call outer1.getInnerMultiplier();
    call Console.log("Inner multiplier via outer method: ", mult3);

    call outer1.setInnerMultiplier(7);
    local mult4: i32 = call outer1.getInnerMultiplier();
    call Console.log("After setInnerMultiplier(7): ", mult4);

    call outer1.incrementCount();
    local cnt1: i32 = call outer1.getCount();
    call Console.log("Count after increment: ", cnt1);

    # Test 4: Outer<i64> with nested Inner<i64>
    call Console.log("\n=== Test 4: Outer<i64> with nested Inner<i64> ===");
    local outer2: Outer<i64>;
    outer2.inner.value = 8888;
    outer2.inner.multiplier = 3;
    outer2.count = 10;

    call Console.log("Inner value (i64): ", outer2.inner.value);

    local cnt2: i32 = call outer2.getCount();
    call Console.log("Outer count: ", cnt2);

    # Test 5: Container<i32, i64> with two Inner types
    call Console.log("\n=== Test 5: Container<i32, i64> ===");
    local container: Container<i32, i64>;
    container.first.value = 10;
    container.first.multiplier = 3;
    container.second.value = 20;
    container.second.multiplier = 7;

    local fval: i32 = call container.first.getValue();
    local sval: i64 = call container.second.getValue();
    call Console.log("First: ", fval, ", Second: ", sval);

    call container.first.setValue(99);
    call container.second.setValue(88);

    local fval2: i32 = call container.first.getValue();
    local sval2: i64 = call container.second.getValue();
    call Console.log("After set - First: ", fval2, ", Second: ", sval2);

    local fmult1: i32 = call container.getFirstMultiplier();
    local smult1: i32 = call container.getSecondMultiplier();
    call Console.log("Before swap - First mult: ", fmult1, ", Second mult: ", smult1);

    call container.swapMultipliers();

    local fmult2: i32 = call container.getFirstMultiplier();
    local smult2: i32 = call container.getSecondMultiplier();
    call Console.log("After swap - First mult: ", fmult2, ", Second mult: ", smult2);

    # Test 6: Triple-nested Wrapper<i32>
    call Console.log("\n=== Test 6: Wrapper<i32> (triple nested) ===");
    local wrapper: Wrapper<i32>;
    wrapper.id = 123;
    wrapper.outer.count = 5;
    wrapper.outer.inner.value = 777;
    wrapper.outer.inner.multiplier = 4;

    local wid: i32 = call wrapper.getId();
    call Console.log("Wrapper ID: ", wid);

    local wcnt: i32 = call wrapper.getOuterCount();
    call Console.log("Outer count: ", wcnt);

    local wval: i32 = call wrapper.outer.inner.getValue();
    call Console.log("Inner value from wrapper: ", wval);

    call wrapper.outer.inner.setValue(555);
    local wval2: i32 = call wrapper.outer.inner.getValue();
    call Console.log("After set via wrapper: ", wval2);

    call wrapper.incrementOuterCount();
    call wrapper.incrementOuterCount();
    local wcnt2: i32 = call wrapper.getOuterCount();
    call Console.log("After 2 increments: ", wcnt2);

    local wmult: i32 = call wrapper.getInnerMultiplier();
    call Console.log("Inner multiplier via wrapper: ", wmult);

    call Console.log("\n=== All nested generic tests completed ===");
    return 0;
}
