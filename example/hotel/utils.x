import scanf, malloc, free from "libc";
import [Console] from "std/io.x";

frame read_string(buffer: *u8, _max_len: u32) {
    call scanf("%s", buffer);
}

frame print_menu() {
    call Console.log("\n--- Hotel Management System ---");
    call Console.log("1. Login");
    call Console.log("2. Register");
    call Console.log("3. Exit");
    call Console.print("Select option: ");
}

frame print_user_menu() {
    call Console.log("\n--- User Menu ---");
    call Console.log("1. Reserve Room");
    call Console.log("2. Check Reservation");
    call Console.log("3. Change Reservation");
    call Console.log("4. Logout");
    call Console.print("Select option: ");
}

export read_string;
export print_menu;
export print_user_menu;
