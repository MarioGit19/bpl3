# Array<T> standard library implementation

export [Array];

extern malloc(size: i64) ret *void;
extern free(ptr: *void) ret void;
extern memcpy(dest: *void, src: *void, n: i64) ret *void;

struct Array<T> {
    data: *T,
    capacity: i32,
    length: i32,
    ###
        creates a new array with the specified initial capacity
    ###
    frame new(initial_capacity: i32) ret Array<T> {
        local arr: Array<T>;
        arr.capacity = initial_capacity;
        arr.length = 0;
        # Calculate size in bytes: capacity * sizeof(T)
        local size: i64 = cast<i64>(initial_capacity) * sizeof<T>();
        arr.data = cast<*T>(malloc(size));
        return arr;
    }

    ###
        destroys the array and frees memory
    ###
    frame destroy(this: *Array<T>) {
        if (this.data != null) {
            free(cast<*void>(this.data));
            this.data = null;
        }
        this.capacity = 0;
        this.length = 0;
    }

    ###
        this returns the current length of the array
    ###
    frame len(this: *Array<T>) ret i32 {
        return this.length;
    }

    ###
        this returns a copy of the element at index
        for primitive types is okay, for complex types consider using getRef()
        because updating copy will not update primitives in original array element
    ###
    frame get(this: *Array<T>, index: i32) ret T {
        return this.data[index];
    }

    ###
        this returns a reference to the element at index
        useful for complex types to avoid copying
        updating the returned reference will update the original array element
    ###
    frame getRef(this: *Array<T>, index: i32) ret *T {
        return &this.data[index];
    }

    ###
        sets the element at index to value
    ###
    frame set(this: *Array<T>, index: i32, value: T) {
        this.data[index] = value;
    }

    frame push(this: *Array<T>, value: T) {
        if (this.length >= this.capacity) {
            # grow
            local new_capacity: i32 = (this.capacity * 2) + 1;
            local size: i64 = cast<i64>(new_capacity) * sizeof<T>();
            local new_data: *T = cast<*T>(malloc(size));

            # Copy old data
            local old_size: i64 = cast<i64>(this.length) * sizeof<T>();
            if (this.data != null) {
                memcpy(cast<*void>(new_data), cast<*void>(this.data), old_size);
                free(cast<*void>(this.data));
            }
            this.data = new_data;
            this.capacity = new_capacity;
        }
        this.data[this.length] = value;
        this.length = this.length + 1;
    }

    frame pop(this: *Array<T>) ret T {
        if (this.length == 0) {
            # Error: empty array
            throw ArrayError { code: 1, message: "Pop from empty array" };
        }
        this.length = this.length - 1;
        return this.data[this.length];
    }

    # Removes the element at index by shifting items left.
    frame removeAt(this: *Array<T>, index: i32) {
        if ((index < 0) || (index >= this.length)) {
            throw ArrayError { code: 2, message: "Index out of bounds" };
        }
        local i: i32 = index;
        loop (i < (this.length - 1)) {
            this.data[i] = this.data[i + 1];
            i = i + 1;
        }
        this.length = this.length - 1;
    }
}

export [ArrayError];
struct ArrayError {
    code: int,
    message: string,
}
