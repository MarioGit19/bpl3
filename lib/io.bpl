# IO utilities
import [String] from "std/string.bpl";
export [IO];

extern printf(fmt: string, ...) ret int;
extern scanf(fmt: string, ...) ret int;
extern gets(buf: string) ret string;
extern strlen(s: string) ret int;

/#
# Input/Output Utilities
Provides standard IO operations like printing and reading input.
#/
struct IO {
    /#
    # Print Formatted
    Wrapper around C `printf`.
    #/
    frame printf(format: string, a0: int) ret int {
        return printf(format, a0);
    }

    /#
    # Read Formatted
    Wrapper around C `scanf`.
    #/
    frame read(format: string, ptr: *void) ret int {
        return scanf(format, ptr);
    }

    /#
    # Print Integer
    Prints an integer followed by a newline.
    #/
    frame printInt(n: int) {
        printf("%d\n", n);
    }

    /#
    # Print String (No Newline)
    Prints a raw string without appending a newline.
    #/
    frame print(s: string) {
        printf("%s", s);
    }

    /#
    # Print String (Line)
    Prints a raw string followed by a newline.
    #/
    frame printString(s: string) {
        printf("%s\n", s);
    }

    /#
    # Print String Object
    Prints a `String` object followed by a newline.
    #/
    frame printString(s: String) {
        printf("%s\n", s.cstr());
    }

    /#
    # Log Message
    Alias for `printString`.
    #/
    frame log(msg: string) {
        printf("%s\n", msg);
    }

    /#
    # Read Line
    Reads a line from stdin into the buffer.
    
    ## Returns
    The length of the string read.
    #/
    frame readLine(buf: string) ret int {
        gets(buf);
        return strlen(buf);
    }
}
