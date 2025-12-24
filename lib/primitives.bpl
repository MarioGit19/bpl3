import [String] from "std/string.bpl";

extern sprintf(str: string, format: string, ...) ret int;
extern snprintf(str: string, size: long, format: string, ...) ret int;
extern printf(format: string, ...) ret int;
extern malloc(size: long) ret string;
extern free(ptr: string) ret void;

struct Int {
    value: int,
    frame toString(this: *Int) ret String {
        local buf: string = malloc(32);
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
        local buf: string = malloc(64);
        sprintf(buf, "%f", this.value);
        local s: String = String.new(buf);
        free(buf);
        return s;
    }
}

struct Long {
    value: long,
    frame toString(this: *Long) ret String {
        local buf: string = malloc(32);
        sprintf(buf, "%lld", this.value);
        local s: String = String.new(buf);
        free(buf);
        return s;
    }
}

struct Char {
    value: char,
    frame toString(this: *Char) ret String {
        local buf: string = malloc(8);
        sprintf(buf, "%c", cast<int>(this.value));
        local s: String = String.new(buf);
        free(buf);
        return s;
    }
}

struct UChar {
    value: uchar,
    frame toString(this: *UChar) ret String {
        local buf: string = malloc(8);
        sprintf(buf, "%c", cast<uint>(this.value));
        local s: String = String.new(buf);
        free(buf);
        return s;
    }
}

struct Short {
    value: short,
    frame toString(this: *Short) ret String {
        local buf: string = malloc(16);
        sprintf(buf, "%hd", cast<int>(this.value));
        local s: String = String.new(buf);
        free(buf);
        return s;
    }
}

struct UShort {
    value: ushort,
    frame toString(this: *UShort) ret String {
        local buf: string = malloc(16);
        sprintf(buf, "%d", cast<int>(this.value));
        local s: String = String.new(buf);
        free(buf);
        return s;
    }
}

struct UInt {
    value: uint,
    frame toString(this: *UInt) ret String {
        local buf: string = malloc(16);
        sprintf(buf, "%u", this.value);
        local s: String = String.new(buf);
        free(buf);
        return s;
    }
}

struct ULong {
    value: ulong,
    frame toString(this: *ULong) ret String {
        local buf: string = malloc(32);
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
