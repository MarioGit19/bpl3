# Comprehensive type checking and method chaining tests

# Test 1: Simple struct with chaining
struct Box<T> {
    value: T,

    static wrap(v: T) ret Box<T> {
        local b: Box<T>;
        b.value = v;
        return b;
    }

    frame unwrap() ret T {
        return this.value;
    }

    frame transform(f: T) ret Box<T> {
        local b: Box<T>;
        b.value = f;
        return b;
    }
}

# Test 2: Method chaining without generics
struct Builder {
    val: i32,

    frame add(x: i32) ret *Builder {
        this.val = this.val + x;
        return this;
    }

    frame mul(x: i32) ret *Builder {
        this.val = this.val * x;
        return this;
    }
}

# Test 3: Function returning struct
frame create_box(x: u64) ret Box<u64> {
    local b: Box<u64>;
    b.value = x;
    return b;
}

frame main() {
    # Test 1: Static method call + instance method on result
    local _v1: u64 = call call Box<u64>.wrap(42).unwrap();

    # Test 2: Multiple chained calls with generics
    local _v2: Box<u64> = call call Box<u64>.wrap(10).transform(20);

    # Test 3: Instance method chaining on non-generic type
    local b: Builder;
    b.val = 5;
    local res: *Builder = call call b.add(3).mul(2);
    local _v3: i32 = res.val;

    # Test 4: Function call result used for method chain
    local _v4: u64 = call call create_box(99).unwrap();
}
