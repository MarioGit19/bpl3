import print_stack_trace, get_stack_trace from "../../lib/debug.x";
import printf from "libc";

frame func_c() {
    call printf("Printing stack trace directly:\n");
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
