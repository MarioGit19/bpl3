# IO utilities
import [String] from "std/string.bpl";
export [IO];

extern printf(fmt: string, ...) ret int;
extern scanf(fmt: string, ...) ret int;
extern gets(buf: string) ret string;
extern strlen(s: *char) ret int;

struct IO {
    frame printf(format: string, a0: int) ret int {
        return printf(format, a0);
    }

    frame read(format: string, ptr: *void) ret int {
        return scanf(format, ptr);
    }

    frame printInt(n: int) {
        printf("%d\n", n);
    }

    frame print(s: string) {
        printf("%s", s);
    }

    frame printString(s: string) {
        printf("%s\n", s);
    }

    frame printString(s: String) {
        printf("%s\n", s.cstr());
    }

    frame log(msg: string) {
        printf("%s\n", msg);
    }

    frame readLine(buf: string) ret int {
        gets(buf);
        return strlen(buf);
    }
}
