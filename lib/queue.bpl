# Queue<T> built on Array<T>

export [Queue];

import [Array] from "std/array.bpl";
import [Option] from "std/option.bpl";

struct Queue<T> {
    inner: Array<T>,
    frame new(initial_capacity: int) ret Queue<T> {
        local q: Queue<T>;
        q.inner = Array<T>.new(initial_capacity);
        return q;
    }

    frame destroy(this: *Queue<T>) {
        this.inner.destroy();
    }

    frame enqueue(this: *Queue<T>, value: T) {
        this.inner.push(value);
    }

    frame dequeue(this: *Queue<T>) ret Option<T> {
        local len: int = this.inner.len();
        if (len <= 0) {
            return Option<T>.None;
        }
        local first: T = this.inner.get(0);
        # Shift all elements to the left by one
        local i: int = 1;
        loop (i < len) {
            local v: T = this.inner.get(i);
            this.inner.set(i - 1, v);
            i = i + 1;
        }
        this.inner.length = len - 1;
        return Option<T>.Some(first);
    }

    frame size(this: *Queue<T>) ret int {
        return this.inner.len();
    }

    frame isEmpty(this: *Queue<T>) ret bool {
        return this.inner.len() == 0;
    }

    frame peek(this: *Queue<T>) ret Option<T> {
        local len: int = this.inner.len();
        if (len <= 0) {
            return Option<T>.None;
        }
        return Option<T>.Some(this.inner.get(0));
    }

    frame clear(this: *Queue<T>) {
        this.inner.length = 0;
    }

    # Operator overloading: Enqueue with << operator
    # Usage: queue << value
    frame __lshift__(this: *Queue<T>, value: T) ret Queue<T> {
        this.enqueue(value);
        return *this;
    }
}
