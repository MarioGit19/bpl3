import [Console] from "io.x";
import exit from "./std.x";
frame print_u64(n: u64) {
    Console.print(n);
}
frame println_u64(n: u64) {
    Console.log(n);
}
frame print_i64(n: i64) {
    Console.print(n);
}
frame println_i64(n: i64) {
    Console.log(n);
}
frame print_str(s: *u8) {
    Console.print(s);
}
frame println_str(s: *u8) {
    Console.log(s);
}
frame print_char(c: u8) {
    # Console.print handles u8 as char if it's a pointer, but here it is value.
    # Console.print_char is defined in io.x
    Console.print_char(c);
}
frame println() {
    Console.println();
}
frame exit_program(code: i32) {
    exit(code);
}
export print_u64;
export println_u64;
export print_i64;
export println_i64;
export print_str;
export println_str;
export print_char;
export println;
export exit_program;
