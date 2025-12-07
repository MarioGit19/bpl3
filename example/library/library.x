import [Console] from "std/io.x";
import strcpy from "libc";

# --- Constants (Global/Compile-Time) ---
global const MAX_TITLE_LEN: u32 = 64;
global const DEFAULT_USER_HEALTH: i32 = 100; # Just for fun!

# --- Global Data (Initialized) ---
global g_total_books: u32 = 0;

# --- Struct Definitions (Data-Only) ---

struct Book {
    id: u64,
    title: u8[64], # Fixed size buffer
    author: u8[64],
    is_checked_out: u8, # 0 or 1
}

struct User {
    user_id: u64,
    name: u8[64], # Fixed size buffer
    health: i32, # An unused health metric
    checked_out_books: *Book, # Pointer to a single book (for simplicity)
}

frame Book_print(book: *Book) {
    call Console.log("Book ID: ", book.id);
    call Console.log("Book Title: ", book.title);
    call Console.log("Book Author: ", book.author);
    call Console.log("Is Checked Out: ", book.is_checked_out);
}

frame User_print(user: *User) {
    call Console.log("User ID: ", user.user_id);
    call Console.log("User Name: ", user.name);
    call Console.log("User Health: ", user.health);
    call Book_print(user.checked_out_books);
}

# 'book' in RDI, 'user' in RSI. Void return.
frame Book_Checkout(book: *Book, user: *User) {
    # Local stack variable for a safety check
    local can_checkout: u8 = 1;

    if can_checkout == (0 + 1) * 1 {
        call Console.log("Debug: can_checkout initialized correctly.");
    }

    call Console.log("Attempting to check out book ID: ", book.id);

    # Go-style 'if' with auto-dereference '.'
    if book.is_checked_out == 1 {
        call Console.log("Error: Book already checked out.");
        can_checkout = 0;
    } else {
        call Console.log("Book is available for checkout.");
    }

    # Single comparison check
    if can_checkout == 1 {
        # Update Book status (auto-dereference on both sides)
        book.is_checked_out = 1;
        call Console.log("Book ID", book.id, "checked out to User ID", user.user_id);

        # Update User link
        user.checked_out_books = book; # User now points to this book

        call Console.log("Book successfully checked out.");
    }
}

# Main function. No arguments, returns u8 (required ret keyword)
frame main() ret u8 {
    # --- Local Variables (Stack) ---

    # Allocate two structs on the stack
    local book1: Book = {id: 101, is_checked_out: 0};
    local user1: User = {user_id: 5001, health: 100, checked_out_books: NULL};

    # Initialize Book strings
    call strcpy(book1.title, "The Low-Level Primer");
    call strcpy(book1.author, "A. Gemini");

    # Initialize User string
    call strcpy(user1.name, "John Smith");

    # user1.name = "Jane Doe"

    # Update the global count
    g_total_books = g_total_books + 1;

    call Console.log("User ID: ", user1.user_id);
    call Console.log("User Name: ", user1.name);
    call Console.log("User Health: ", user1.health);
    call Console.log("Total Books in Library: ", g_total_books);

    # --- Function Call ---
    # Pass the addresses (pointers) of the stack variables
    call Book_Checkout(&book1, &user1);

    # --- Verification and Pointer Arithmetic ---

    local check_ptr: *Book = &book1;
    local count: u32 = 0;

    # Loop until we find a match or hit a limit
    loop {
        # Comparison check: uses pointer arithmetic (check_ptr + count)
        # and dereferencing (*)

        local ptr_val: *Book = check_ptr + count;

        if ptr_val.id == 101 {
            break; # Found it!
        }

        count = count + 1;

        # Simple safety check for infinite loop
        if count > 100 {
            break;
        }
    }

    # --- Final Output and Exit ---
    call Console.log("\n--- Final Status ---");
    call Console.log("User: ", user1.name);
    call Console.log("Health: ", user1.health);
    call Console.log("Checked Out Book Title: ", user1.checked_out_books.title);

    call User_print(&user1);

    # Exit the program with a successful exit code (0)
    asm {
        mov rax, [(count)]
        mov rax, 60     # syscall: exit
        mov rdi, 0      # exit code 0
        syscall
    }

    return 0;
}
