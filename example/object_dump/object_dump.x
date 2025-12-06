import print, exit from "std";
import [File], removeFile from "std/file";
import printf from "libc";

struct Player {
    id: u64,
    level: u32,
    health: i32,
    score: u64,
}

frame main() {
    local filename: *u8 = "player_save.dat";
    local p1: Player;
    local p2: Player;
    local f: File;

    call print("--- Object Dump/Restore Test ---\n");

    # 1. Initialize Player 1
    p1.id = 12345;
    p1.level = 42;
    p1.health = 85;
    p1.score = 999999;

    call printf("Original Player: ID=%lu, Level=%u, Health=%d, Score=%lu\n", p1.id, p1.level, p1.health, p1.score);

    # 2. Save Player 1 to file
    call print("Saving player to file...\n");
    if (call f.open(filename, "w")) == 0 {
        call print("Error: Could not open file for writing\n");
        call exit(1);
    }

    # Write the struct memory directly
    # We cast the address of p1 to *u8 and write sizeof(Player) bytes
    local bytesWritten: u64 = call f.write(cast<*u8>(&p1), sizeof(Player));
    call f.close();

    if bytesWritten == sizeof(Player) {
        call print("Save successful.\n");
    } else {
        call print("Error: Did not write full struct size.\n");
        call exit(1);
    }

    # 3. Load into Player 2 (which is empty/garbage)
    # Initialize p2 with zeros just to be sure we are reading new data
    p2.id = 0;
    p2.level = 0;
    p2.health = 0;
    p2.score = 0;

    call print("Loading player from file...\n");
    if (call f.open(filename, "r")) == 0 {
        call print("Error: Could not open file for reading\n");
        call exit(1);
    }

    local bytesRead: u64 = call f.read(cast<*u8>(&p2), sizeof(Player));
    call f.close();

    if bytesRead == sizeof(Player) {
        call print("Load successful.\n");
    } else {
        call print("Error: Did not read full struct size.\n");
        call exit(1);
    }

    call printf("Restored Player: ID=%lu, Level=%u, Health=%d, Score=%lu\n", p2.id, p2.level, p2.health, p2.score);

    # 4. Verify equality
    if p1.id == p2.id {
        if p1.level == p2.level {
            if p1.health == p2.health {
                if p1.score == p2.score {
                    call print("SUCCESS: Restored object matches original.\n");
                } else {
                    call print("FAILURE: Score mismatch.\n");
                    call exit(1);
                }
            } else {
                call print("FAILURE: Health mismatch.\n");
                call exit(1);
            }
        } else {
            call print("FAILURE: Level mismatch.\n");
            call exit(1);
        }
    } else {
        call print("FAILURE: ID mismatch.\n");
        call exit(1);
    }

    # Cleanup
    call removeFile(filename);
    call print("--- Test Complete ---\n");
}
