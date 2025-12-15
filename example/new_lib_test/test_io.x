import [Console] from "std/io.x";

frame main() {
    call Console.print_str("--- Testing IO ---\n");

    call Console.print_str("String test: Hello World\n");

    call Console.print_str("Int test (positive): ");
    call Console.print_int(12345);
    call Console.println();

    call Console.print_str("Int test (negative): ");
    call Console.print_int(-6789);
    call Console.println();

    call Console.print_str("Int test (zero): ");
    call Console.print_int(0);
    call Console.println();

    call Console.print_str("Char test: ");
    call Console.print_char('A');
    call Console.print_char('B');
    call Console.print_char('C');
    call Console.println();

    call Console.print_str("--- IO Test Complete ---\n");
}
