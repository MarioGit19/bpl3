import std_malloc, std_realloc, std_free from "std/memory.x";

# Generic Array struct with methods
struct Array<T> {
    data: *T,
    length: u64,
    capacity: u64,

    frame push(value: T) {
        if this.capacity == 0 {
            this.capacity = 4;
            this.data = cast<*T>(std_malloc(this.capacity * sizeof(T)));
            this.length = 0;
        } else if this.length >= this.capacity {
            this.capacity = this.capacity * 2;
            this.data = cast<*T>(std_realloc(cast<*u8>(this.data), this.capacity * sizeof(T)));
        }

        this.data[this.length] = value;
        this.length = this.length + 1;
    }

    frame pop() ret T {
        if this.length == 0 {
            local zero: T;
            return zero;
        }
        this.length = this.length - 1;
        return this.data[this.length];
    }

    frame len() ret u64 {
        return this.length;
    }

    frame get(index: u64) ret T {
        return this.data[index];
    }

    frame set(index: u64, value: T) {
        this.data[index] = value;
    }

    frame clear() {
        this.length = 0;
        # We don't free memory here to keep capacity for reuse
    }

    frame free() {
        if this.data != NULL {
            std_free(cast<*u8>(this.data));
            this.data = NULL;
        }
        this.length = 0;
        this.capacity = 0;
    }

    frame indexOf(item: T) ret i64 {
        local i: u64 = 0;
        loop {
            if i >= this.length {
                break;
            }
            if item.equals(&this.data[i]) {
                return i;
            }
            i = i + 1;
        }
        return -1;
    }

    frame removeAt(index: u64) {
        if index >= this.length {
            return;
        }
        local i: u64 = index;
        loop {
            if i >= this.length - 1 {
                break;
            }
            this.data[i] = this.data[i + 1];
            i = i + 1;
        }
        this.length = this.length - 1;
    }

    frame equals(other: *Array<T>) ret u64 {
        if this.length != other.length {
            return 0;
        }
        local i: u64 = 0;
        loop {
            if i >= this.length {
                break;
            }
            if (this.data[i].equals(&other.data[i])) == 0 {
                return 0;
            }
            i = i + 1;
        }
        return 1;
    }

    frame empty(capacity: u64) ret Array<T> {
        local arr: Array<T>;
        if capacity > 0 {
            arr.capacity = capacity;
            arr.data = cast<*T>(std_malloc(capacity * sizeof(T)));
        } else {
            arr.capacity = 0;
            arr.data = NULL;
        }
        arr.length = 0;
        return arr;
    }

    frame new(items: T[]) ret Array<T> {
        local arr: Array<T>;
        local size: u64 = items.length;

        if size > 0 {
            arr.capacity = size;
            arr.data = cast<*T>(std_malloc(size * sizeof(T)));

            local i: u64 = 0;
            loop {
                if i >= size {
                    break;
                }
                arr.data[i] = items.data[i];
                i = i + 1;
            }

            arr.length = size;
        } else {
            arr.capacity = 0;
            arr.data = NULL;
            arr.length = 0;
        }
        return arr;
    }
}

export [Array];
