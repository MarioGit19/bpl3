import [Console] from "std/io.x";

struct Math {

    static add(a: i32, b: i32) ret i32 {
        return a + b;
    }
}

struct Counter {
    count: i32,

    static new(start: i32) ret Counter {
        return cast<Counter>({count: start});
    }

    frame increment() {
        this.count = this.count + 1;
    }
}

frame main() {
    # Test static method call
    local sum: i32 = call Math.add(10, 20);
    call Console.log("Sum: ", sum);

    # Test static factory method
    local c: Counter = call Counter.new(5);
    call Console.log("Counter start: ", c.count);

    # Test instance method
    call c.increment();
    call Console.log("Counter after inc: ", c.count);
}
