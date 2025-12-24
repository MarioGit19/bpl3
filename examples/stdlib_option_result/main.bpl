import [Option] from "std/option.bpl";
import [Result] from "std/result.bpl";
import [IO] from "std/io.bpl";

frame demoOption() {
    IO.log("=== Option Demo ===");
    local o1: Option<int> = Option<int>.Some(42);
    local o2: Option<int> = Option<int>.None;
    IO.printInt(o1.unwrap());
    try {
        local v: int = o2.unwrap();
        IO.printInt(v);
    } catch (e_int: int) {
        IO.log("Caught Option unwrap error");
    }
    IO.printInt(o2.unwrapOr(7));
}

frame demoResult() {
    IO.log("=== Result Demo ===");
    local r1: Result<int, int> = Result<int, int>.Ok(10);
    local r2: Result<int, int> = Result<int, int>.Err(5);
    IO.printInt(r1.unwrap());
    try {
        local v: int = r2.unwrap();
        IO.printInt(v);
    } catch (e_int: int) {
        IO.log("Caught Result error: 5");
    }
    IO.printInt(r2.unwrapOr(99));
}

frame main() ret int {
    demoOption();
    demoResult();
    return 0;
}
