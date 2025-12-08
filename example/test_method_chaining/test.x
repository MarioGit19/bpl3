# Test struct with methods that return the same type for chaining
struct Builder {
    value: i32,

    frame add(x: i32) ret *Builder {
        this.value = this.value + x;
        return this;
    }

    frame mul(x: i32) ret *Builder {
        this.value = this.value * x;
        return this;
    }

    frame get_value() ret i32 {
        return this.value;
    }
}

frame main() {
    # Test 1: Method chaining through pointer
    local b: Builder;
    b.value = 5;
    # This creates a chained method call:
    # b.add(3) returns *Builder
    # The result.mul(2) is called on the returned pointer
    # The result.get_value() returns i32
    local result: i32 = call call call b.add(3).mul(2).get_value();
}
