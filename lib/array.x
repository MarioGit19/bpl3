import printf, malloc, realloc, free from "libc";

extern malloc(size: u64) ret *u8;
extern realloc(ptr: *u8, size: u64) ret *u8;
extern free(ptr: *u8);

# Generic Array struct with methods
struct Array<T> {
    data: *T,
    length: u64,
    capacity: u64,

    frame push(value: T) {
        if this.capacity == 0 {
            this.capacity = 4;
            this.data = cast<*T>(call malloc(this.capacity * sizeof(T)));
            this.length = 0;
        } else if this.length >= this.capacity {
            this.capacity = this.capacity * 2;
            this.data = cast<*T>(call realloc(cast<*u8>(this.data), this.capacity * sizeof(T)));
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
            call free(cast<*u8>(this.data));
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
            if call item.equals(&this.data[i]) {
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

    frame equals(other: *Array<T>) ret u8 {
        if this.length != other.length {
            return 0;
        }
        local i: u64 = 0;
        loop {
            if i >= this.length {
                break;
            }
            if (call this.data[i].equals(&other.data[i])) == 0 {
                return 0;
            }
            i = i + 1;
        }
        return 1;
    }
}

export [Array];
