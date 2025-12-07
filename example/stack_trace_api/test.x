import print_stack_trace, get_stack_trace from "../../lib/debug.x";
import [Console] from "std/io.x";

frame func_c() {
    call Console.log("Printing stack trace directly: ");
    call print_stack_trace();
}

frame func_b() {
    call func_c();
}

frame func_a() {
    call func_b();
}

frame main() {
    call func_a();
}
