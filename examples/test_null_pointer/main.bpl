import [String] from "std/string.bpl";
extern printf(f: string, ...);

struct X {
    a: String,
}

frame main() ret int {
    local x: X = X { a: String.new("initial") };
    x = null;
    local y: *X = &x;

    try {
        y.a = String.new("null assignment");
        printf("ERROR: Should have thrown on y.a access!\n");
    } catch (e: NullAccessError) {
        printf("Caught: %s in %s (expr: %s)\n", e.message, e.function, e.expression);
    }
    return 0;
}
