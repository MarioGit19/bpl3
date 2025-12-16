# String standard library

export [String];

extern strlen(s: *char) ret int;
extern strcpy(dst: *char, src: *char) ret *char;
extern malloc(size: i64) ret *char;
extern free(ptr: *char) ret void;

struct String {
    data: *char,
    length: int,
    frame new(text: *char) ret String {
        local s: String;
        if (text == null) {
            s.data = null;
            s.length = 0;
            return s;
        }
        local len: int = strlen(text);
        s.length = len;
        s.data = malloc(cast<i64>(len + 1));
        strcpy(s.data, text);
        return s;
    }

    frame destroy(this: *String) {
        if (this.data != null) {
            free(this.data);
            this.data = null;
        }
        this.length = 0;
    }

    frame cstr(this: *String) ret *char {
        return this.data;
    }

    frame assign(this: *String, text: *char) {
        this.destroy();
        local newStr: String = String.new(text);
        this.data = newStr.data;
        this.length = newStr.length;
    }

    frame includes(this: *String, substr: *char) ret bool {
        if ((this.data == null) || (substr == null)) {
            return false;
        }
        local substrLen: int = strlen(substr);
        if ((substrLen == 0) || (substrLen > this.length)) {
            return false;
        }
        local i: int = 0;
        loop (i <= (this.length - substrLen)) {
            local found: bool = true;
            local j: int = 0;
            loop (j < substrLen) {
                if (*(this.data + cast<i64>(i + j)) != *(substr + cast<i64>(j))) {
                    found = false;
                    break;
                }
                j = j + 1;
            }
            if (found) {
                return true;
            }
            i = i + 1;
        }
        return false;
    }
}
