import print_str, print_int, print_char, println from "std/io.x";

frame main() {
    call print_str("--- Testing IO ---\n");

    call print_str("String test: Hello World\n");

    call print_str("Int test (positive): ");
    call print_int(12345);
    call println();

    call print_str("Int test (negative): ");
    call print_int(-6789);
    call println();

    call print_str("Int test (zero): ");
    call print_int(0);
    call println();

    call print_str("Char test: ");
    call print_char('A');
    call print_char('B');
    call print_char('C');
    call println();

    call print_str("--- IO Test Complete ---\n");
}
