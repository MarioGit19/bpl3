import [IO] from "std";

frame main() {
    local x: long = 1234567890123;
    IO.printString(x.toString());

    local y: i64 = 9876543210987;
    IO.printString(y.toString());

    IO.printString(cast<long>(42).toString());
}
