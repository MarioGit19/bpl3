import printf from "libc";

struct Math {

    static fib(n: i64) ret i64 {
        if n <= 1 {
            return n;
        }
        return (call Math.fib(n - 1)) + (call Math.fib(n - 2));
    }

    static identity<T>(val: T) ret T {
        return val;
    }
}

struct Logger {

    static log(msg: *u8) {
        call printf("[LOG]: %s\n", msg);
    }
}

struct Worker {
    id: i32,

    frame doWork() {
        call Logger.log("Worker started");
        call printf("Worker ID: %d\n", this.id);
    }
}

struct Factory {

    static new(id: i32) ret Worker {
        local w: Worker;
        w.id = id;
        call w.doWork(); # Call instance method from static
        return w;
    }
}

frame main() {
    # 1. Recursive Static Call
    local f: i64 = call Math.fib(10);
    call printf("Fib(10): %lld\n", f);

    # 2. Generic Static Method
    local x: i32 = call Math.identity<i32>(42);
    call printf("Identity: %d\n", x);

    # 3. Static Factory & Instance Call
    local w: Worker = call Factory.new(99);
    call printf("Created worker with ID: %d\n", w.id);
}
