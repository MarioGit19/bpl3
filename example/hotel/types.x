struct User {
    id: u64,
    username: u8[32],
    password: u8[32],
    next: *User,
}

struct Room {
    number: u32,
    capacity: u8,
    price: u32,
    is_reserved: u8,
    next: *Room,
}

struct Reservation {
    id: u64,
    user_id: u64,
    room_number: u32,
    nights: u32,
    total_price: u32,
    next: *Reservation,
}

export [User];
export [Room];
export [Reservation];
