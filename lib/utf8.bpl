# UTF-8 (simple wrappers)

export [UTF8];

import [String] from "std/string.bpl";

struct UTF8 {
    frame encode(s: string) ret string {
        # Strings are already UTF-8; return pointer
        return cast<string>(s);
    }
    frame decode(buf: string) ret String {
        # Construct String from char* buffer
        return String.new(buf);
    }
}
