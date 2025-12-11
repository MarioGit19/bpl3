import std_malloc, std_realloc, std_free from "std/memory.x";

# Dynamic String struct
struct String {
    buffer: *u8,
    length: u64,
    capacity: u64,

    frame strlen(str: *u8) ret u64 {
        local len: u64 = 0;
        loop {
            if str[len] == 0 {
                break;
            }
            len = len + 1;
        }
        return len;
    }

    frame strcpy(dest: *u8, src: *u8) {
        local i: u64 = 0;
        loop {
            dest[i] = src[i];
            if src[i] == 0 {
                break;
            }
            i = i + 1;
        }
    }

    frame strcat(dest: *u8, src: *u8) {
        local dest_len: u64 = String.strlen(dest);
        local i: u64 = 0;
        loop {
            dest[dest_len + i] = src[i];
            if src[i] == 0 {
                break;
            }
            i = i + 1;
        }
    }

    frame strcmp(s1: *u8, s2: *u8) ret i64 {
        local i: u64 = 0;
        loop {
            if s1[i] != s2[i] {
                return cast<i64>(s1[i]) - cast<i64>(s2[i]);
            }
            if s1[i] == 0 {
                return 0;
            }
            i = i + 1;
        }
        return 0;
    }

    frame streq(s1: *u8, s2: *u8) ret u64 {
        local res: i64 = String.strcmp(s1, s2);
        if res == 0 {
            return 1;
        }
        return 0;
    }

    frame is_digit(c: u8) ret u64 {
        if c >= '0' && c <= '9' {
            return 1;
        }
        return 0;
    }

    frame is_alpha(c: u8) ret u64 {
        if c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' {
            return 1;
        }
        return 0;
    }

    frame is_space(c: u8) ret u64 {
        if c == 32 || c == 9 || c == 10 || c == 13 {
            return 1;
        }
        return 0;
    }

    frame to_upper(str: *u8) {
        local i: u64 = 0;
        loop {
            if str[i] == 0 {
                break;
            }
            if str[i] >= 'a' && str[i] <= 'z' {
                str[i] = str[i] - 32;
            }
            i = i + 1;
        }
    }

    frame to_lower(str: *u8) {
        local i: u64 = 0;
        loop {
            if str[i] == 0 {
                break;
            }
            if str[i] >= 'A' && str[i] <= 'Z' {
                str[i] = str[i] + 32;
            }
            i = i + 1;
        }
    }

    frame atoi(str: *u8) ret i64 {
        local res: i64 = 0;
        local sign: i64 = 1;
        local i: u64 = 0;

        # Skip whitespace
        loop {
            if (String.is_space(str[i])) == 0 {
                break;
            }
            i = i + 1;
        }

        if str[i] == '-' {
            sign = -1;
            i = i + 1;
        } else if str[i] == '+' {
            i = i + 1;
        }

        loop {
            if str[i] == 0 {
                break;
            }
            if (String.is_digit(str[i])) == 0 {
                break;
            }
            res = res * 10 + (str[i] - '0');
            i = i + 1;
        }
        return res * sign;
    }

    frame init() {
        this.length = 0;
        this.capacity = 16;
        this.buffer = cast<*u8>(std_malloc(this.capacity));
        this.buffer[0] = 0;
    }

    frame from_c_str(s: *u8) {
        this.length = (String.strlen(s));
        this.capacity = this.length + 1;
        if this.capacity < 16 {
            this.capacity = 16;
        }
        this.buffer = std_malloc(this.capacity);
        String.strcpy(this.buffer, s);
    }

    frame len() ret u64 {
        return this.length;
    }

    frame ensure_capacity(min_cap: u64) {
        if this.capacity >= min_cap {
            return;
        }
        local new_cap: u64 = this.capacity * 2;
        if new_cap < min_cap {
            new_cap = min_cap;
        }
        this.buffer = cast<*u8>(std_realloc(this.buffer, new_cap));
        this.capacity = new_cap;
    }

    frame append(s: *u8) {
        local s_len: u64 = String.strlen(s);
        this.ensure_capacity(this.length + s_len + 1);
        String.strcpy(this.buffer + this.length, s);
        this.length = this.length + s_len;
    }

    frame append_char(c: u8) {
        this.ensure_capacity(this.length + 2);
        this.buffer[this.length] = c;
        this.length = this.length + 1;
        this.buffer[this.length] = 0;
    }

    frame concat(other: *String) {
        this.append(other.buffer);
    }

    frame slice(start: u64, end: u64, dest: *String) {
        if start >= this.length {
            dest.init();
            return;
        }
        if end > this.length {
            end = this.length;
        }
        local len: u64 = end - start;
        dest.length = len;
        dest.capacity = len + 1;
        if dest.capacity < 16 {
            dest.capacity = 16;
        }
        dest.buffer = cast<*u8>(std_malloc(dest.capacity));

        local i: u64 = 0;
        loop {
            if i >= len {
                break;
            }
            dest.buffer[i] = this.buffer[start + i];
            i = i + 1;
        }
        dest.buffer[len] = 0;
    }

    frame charAt(index: u64) ret u8 {
        if index >= this.length {
            return 0;
        }
        return this.buffer[index];
    }

    frame setChar(index: u64, c: u8) {
        if index < this.length {
            this.buffer[index] = c;
        }
    }

    frame equals(other: *String) ret u64 {
        if this.length != other.length {
            return 0;
        }
        return String.streq(this.buffer, other.buffer);
    }

    frame indexOf(c: u8) ret i64 {
        local i: u64 = 0;
        loop {
            if i >= this.length {
                break;
            }
            if this.buffer[i] == c {
                return i;
            }
            i = i + 1;
        }
        return -1;
    }

    frame c_str() ret *u8 {
        return this.buffer;
    }

    frame free() {
        if this.buffer != NULL {
            std_free(this.buffer);
            this.buffer = NULL;
        }
        this.length = 0;
        this.capacity = 0;
    }

    frame new(s: *u8) ret String {
        local str: String;
        str.from_c_str(s);
        return str;
    }
}

export [String];
