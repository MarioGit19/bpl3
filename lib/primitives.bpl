import [String] from "std/string.bpl";

extern sprintf(str: *char, format: *char, ...) ret i32;
extern snprintf(str: *char, size: i64, format: *char, ...) ret i32;
extern printf(format: *char, ...) ret i32;
extern malloc(size: i64) ret *char;
extern free(ptr: *char) ret void;

struct Int {
    value: i32,
    frame toString(this: *Int) ret String {
        local buf: *char = malloc(32);
        sprintf(buf, "%d", this.value);
        local s: String = String.new(buf);
        free(buf);
        return s;
    }
}

struct Bool {
    value: bool,
    frame toString(this: *Bool) ret String {
        if (this.value) {
            return String.new("true");
        } else {
            return String.new("false");
        }
    }
}

struct Double {
    value: double,
    frame toString(this: *Double) ret String {
        local buf: *char = malloc(64);
        sprintf(buf, "%f", this.value);
        local s: String = String.new(buf);
        free(buf);
        return s;
    }
}

struct Long {
    value: i64,
    frame toString(this: *Long) ret String {
        local buf: *char = malloc(32);
        sprintf(buf, "%lld", this.value);
        local s: String = String.new(buf);
        free(buf);
        return s;
    }
}

struct Char {
    value: i8,
    frame toString(this: *Char) ret String {
        local buf: *char = malloc(8);
        sprintf(buf, "%c", cast<i32>(this.value));
        local s: String = String.new(buf);
        free(buf);
        return s;
    }
}

struct UChar {
    value: u8,
    frame toString(this: *UChar) ret String {
        local buf: *char = malloc(8);
        sprintf(buf, "%c", cast<u32>(this.value));
        local s: String = String.new(buf);
        free(buf);
        return s;
    }
}

struct Short {
    value: i16,
    frame toString(this: *Short) ret String {
        local buf: *char = malloc(16);
        sprintf(buf, "%hd", cast<i32>(this.value));
        local s: String = String.new(buf);
        free(buf);
        return s;
    }
}

struct UShort {
    value: u16,
    frame toString(this: *UShort) ret String {
        local buf: *char = malloc(16);
        sprintf(buf, "%d", cast<i32>(this.value));
        local s: String = String.new(buf);
        free(buf);
        return s;
    }
}

struct UInt {
    value: u32,
    frame toString(this: *UInt) ret String {
        local buf: *char = malloc(16);
        sprintf(buf, "%u", this.value);
        local s: String = String.new(buf);
        free(buf);
        return s;
    }
}

struct ULong {
    value: u64,
    frame toString(this: *ULong) ret String {
        local buf: *char = malloc(32);
        sprintf(buf, "%llu", this.value);
        local s: String = String.new(buf);
        free(buf);
        return s;
    }
}

export [Int];
export [Bool];
export [Double];
export [Long];
export [Char];
export [UChar];
export [Short];
export [UShort];
export [UInt];
export [ULong];
