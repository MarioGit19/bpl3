# Test generics with struct methods

import [Console] from "std/io.x";

# Test 1: Generic struct with methods that return T
struct Box<T> {
    value: T,

    frame getValue() ret T {
        return this.value;
    }

    frame setValue(newValue: T) {
        this.value = newValue;
    }
}

# Test 2: Generic pair with two type parameters
struct Pair<A, B> {
    first: A,
    second: B,

    frame getFirst() ret A {
        return this.first;
    }

    frame getSecond() ret B {
        return this.second;
    }

    frame setFirst(val: A) {
        this.first = val;
    }

    frame setSecond(val: B) {
        this.second = val;
    }
}

# Test 3: Generic struct with non-generic methods
struct Container<T> {
    value: T,
    count: i32,

    frame getCount() ret i32 {
        return this.count;
    }

    frame incrementCount() {
        this.count = this.count + 1;
    }
}

frame main() ret i32 {
    # Test 1: Box<i32>
    call Console.log("=== Test 1: Box<i32> ===");
    local intBox: Box<i32>;
    intBox.value = 42;
    local val1: i32 = call intBox.getValue();
    call Console.log("Box<i32> value: ", val1);

    call intBox.setValue(100);
    local val2: i32 = call intBox.getValue();
    call Console.log("After setValue(100): ", val2);

    # Test 2: Box<i64>
    call Console.log("\n=== Test 2: Box<i64> ===");
    local longBox: Box<i64>;
    longBox.value = 9999;
    local val3: i64 = call longBox.getValue();
    call Console.log("Box<i64> value: ", val3);

    # Test 3: Pair<i32, i64>
    call Console.log("\n=== Test 3: Pair<i32, i64> ===");
    local pair: Pair<i32, i64>;
    pair.first = 10;
    pair.second = 20;

    local f1: i32 = call pair.getFirst();
    local s1: i64 = call pair.getSecond();
    call Console.log("Pair: first=", f1, ", second=", s1);

    call pair.setFirst(99);
    call pair.setSecond(88);

    local f2: i32 = call pair.getFirst();
    local s2: i64 = call pair.getSecond();
    call Console.log("After set: first=", f2, ", second=", s2);

    # Test 4: Container<i32>
    call Console.log("\n=== Test 4: Container<i32> ===");
    local intContainer: Container<i32>;
    intContainer.value = 777;
    intContainer.count = 0;

    local cnt1: i32 = call intContainer.getCount();
    call Console.log("Initial count: ", cnt1);

    call intContainer.incrementCount();
    call intContainer.incrementCount();
    local cnt2: i32 = call intContainer.getCount();
    call Console.log("After 2 increments: ", cnt2);

    call Console.log("\n=== All generic method tests completed ===");
    return 0;
}
