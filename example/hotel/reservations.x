import [Reservation], [User], [Room] from "./types.x";
import malloc, free from "libc";
import [Console] from "std/io.x";

extern malloc(size: u64) ret *u8;

global g_res_head: *Reservation = NULL;
global g_res_id_counter: u64 = 1;

frame print_invoice(res: *Reservation) {
    call Console.log("\n--- INVOICE ---");
    call Console.log("Reservation ID: ", res.id);
    call Console.log("User ID: ", res.user_id);
    call Console.log("Room Number: ", res.room_number);
    call Console.log("Nights: ", res.nights);
    call Console.log("Total Price: $", res.total_price);
    call Console.log("----------------");
}

frame create_reservation(user: *User, room: *Room, nights: u32) {
    local res: *Reservation = call malloc(40);
    res.id = g_res_id_counter;
    g_res_id_counter = g_res_id_counter + 1;
    res.user_id = user.id;
    res.room_number = room.number;
    res.nights = nights;
    res.total_price = room.price * nights;
    res.next = g_res_head;
    g_res_head = res;

    room.is_reserved = 1;

    call Console.log("Reservation created successfully!");
    call print_invoice(res);
}

frame check_reservation(user: *User) {
    call Console.log("\nYour Reservations: ");
    local current: *Reservation = g_res_head;
    local found: u8 = 0;
    loop {
        if current == NULL {
            break;
        }
        if current.user_id == user.id {
            call print_invoice(current);
            found = 1;
        }
        current = current.next;
    }
    if found == 0 {
        call Console.log("No reservations found.");
    }
}

frame change_reservation(user: *User, res_id: u64, new_nights: u32) {
    local current: *Reservation = g_res_head;
    loop {
        if current == NULL {
            break;
        }
        if current.id == res_id {
            if current.user_id == user.id {
                local price_per_night: u32 = current.total_price // current.nights;
                current.nights = new_nights;
                current.total_price = price_per_night * new_nights;
                call Console.log("Reservation updated.");
                call print_invoice(current);
                return;
            } else {
                call Console.log("Error: Reservation does not belong to you.");
                return;
            }
        }
        current = current.next;
    }
    call Console.log("Error: Reservation not found.");
}

export create_reservation;
export check_reservation;
export change_reservation;
