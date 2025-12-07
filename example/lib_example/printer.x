import [Console] from "std/io.x";

frame logNumber(n: u64) {
    call Console.log("Number: ", n);
}
export logNumber;

global value: u64 = 69;
frame logGlobal() {
    if value == 69 {
        call Console.log("NICE");
    } else {
        call Console.log("NOT NoICE");
    }
}
export logGlobal;
