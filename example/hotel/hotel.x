import [User], [Room], [Reservation] from "./types.x";
import register_user, login_user from "./auth.x";
import init_rooms, list_available_rooms, get_room from "./rooms.x";
import create_reservation, check_reservation, change_reservation from "./reservations.x";
import read_string, print_menu, print_user_menu from "./utils.x";
import scanf from "libc";
import [Console] from "std/io.x";
import exit from "std";

frame main() ret u64 {
    call init_rooms();

    local choice: u32 = 0;
    local username: u8[32];
    local password: u8[32];
    local current_user: *User = NULL;
    local room_num: u32 = 0;
    local nights: u32 = 0;
    local res_id: u64 = 0;
    local new_nights: u32 = 0;
    local room: *Room = NULL;

    loop {
        if current_user == NULL {
            call print_menu();
            call scanf("%d", &choice);

            if choice == 1 { # Login
                call Console.print("Username: ");
                call read_string(username, 32);
                call Console.print("Password: ");
                call read_string(password, 32);
                current_user = call login_user(username, password);
                if current_user != NULL {
                    call Console.log("Login successful! Welcome, ", current_user.username, ".");
                } else {
                    call Console.log("Login failed.");
                }
            } else if choice == 2 { # Register
                call Console.print("New Username: ");
                call read_string(username, 32);
                call Console.print("New Password: ");
                call read_string(password, 32);
                call register_user(username, password);
            } else if choice == 3 { # Exit
                call Console.log("Goodbye!");
                call exit(0);
            } else {
                call Console.log("Invalid option.");
            }
        } else {
            call print_user_menu();
            call scanf("%d", &choice);

            if choice == 1 { # Reserve Room
                call list_available_rooms();
                call Console.print("Enter Room Number to reserve (0 to cancel): ");
                call scanf("%d", &room_num);
                if room_num != 0 {
                    room = call get_room(room_num);
                    if room != NULL {
                        if room.is_reserved == 0 {
                            call Console.print("Enter number of nights: ");
                            call scanf("%d", &nights);
                            call create_reservation(current_user, room, nights);
                        } else {
                            call Console.log("Room is already reserved.");
                        }
                    } else {
                        call Console.log("Room not found.");
                    }
                }
            } else if choice == 2 { # Check Reservation
                call check_reservation(current_user);
            } else if choice == 3 { # Change Reservation
                call Console.print("Enter Reservation ID to change: ");
                call scanf("%lu", &res_id);
                call Console.print("Enter new number of nights: ");
                call scanf("%d", &new_nights);
                call change_reservation(current_user, res_id, new_nights);
            } else if choice == 4 { # Logout
                current_user = NULL;
                call Console.log("Logged out.");
            } else {
                call Console.log("Invalid option.");
            }
        }
    }
    return 0;
}
