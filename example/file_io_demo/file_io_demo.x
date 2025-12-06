import print, exit from "std";
import [File], SEEK_SET, SEEK_END, removeFile from "std/file";

frame main() {
    local filename: *u8 = "test_output.txt";
    local bin_filename: *u8 = "test_binary.dat";
    local content: *u8 = "Hello, File I/O World!";
    local appended: *u8 = " Appended text.";
    local buffer: u8[100];
    local f: File;
    local i: u64 = 0;

    call print("--- Starting Extended File I/O Test ---\n");

    # --- Part 1: Basic Write ---
    call print("\n[1] Basic Write\n");
    if (call f.open(filename, "w")) == 0 {
        call print("Error: Could not open file for writing\n");
        call exit(1);
    }
    call f.writeString(content);
    call f.close();
    call print("Written: '");
    call print(content);
    call print("'\n");

    # --- Part 2: Append ---
    call print("\n[2] Append Mode\n");
    if (call f.open(filename, "a")) == 0 {
        call print("Error: Could not open file for appending\n");
        call exit(1);
    }
    call f.writeString(appended);
    call f.close();
    call print("Appended: '");
    call print(appended);
    call print("'\n");

    # --- Part 3: Read All & Verify ---
    call print("\n[3] Read All & Verify\n");
    if (call f.open(filename, "r")) == 0 {
        call print("Error: Could not open file for reading\n");
        call exit(1);
    }

    # Clear buffer
    i = 0;
    loop {
        if i >= 100 {
            break;
        }
        buffer[i] = 0;
        i = i + 1;
    }

    call f.read(buffer, 100);
    call print("Read content: '");
    call print(buffer);
    call print("'\n");

    # Verify "Hello, File I/O World! Appended text."
    # We'll just check the start and end for brevity in this demo
    if buffer[0] == 'H' {
        if buffer[23] == 'A' { # 'A' of " Appended" (index 22 is space)
            call print("SUCCESS: Content verification passed.\n");
        } else {
            call print("FAILURE: Content mismatch (Appended part).\n");
            call exit(1);
        }
    } else {
        call print("FAILURE: Content mismatch (Start).\n");
        call exit(1);
    }

    # --- Part 4: Tell & Rewind ---
    call print("\n[4] Tell & Rewind\n");

    # Rewind to start using seek
    call f.seek(0, call SEEK_SET());
    local pos: i64 = call f.tell();
    if pos == 0 {
        call print("Rewind successful, pos = 0\n");
    } else {
        call print("FAILURE: Rewind failed\n");
        call exit(1);
    }

    # Read 5 bytes "Hello"
    # Clear buffer
    i = 0;
    loop {
        if i >= 100 {
            break;
        }
        buffer[i] = 0;
        i = i + 1;
    }

    call f.read(buffer, 5);
    call print("Read 5 bytes: '");
    call print(buffer);
    call print("'\n");

    pos = (call f.tell());
    if pos == 5 {
        call print("Tell successful, pos = 5\n");
    } else {
        call print("FAILURE: Tell failed\n");
        call exit(1);
    }

    call f.close();

    # --- Part 5: Binary I/O ---
    call print("\n[5] Binary I/O\n");

    # Write binary data
    if (call f.open(bin_filename, "w")) == 0 {
        call print("Error: Could not open binary file\n");
        call exit(1);
    }

    # Reuse buffer to store binary data: 10, 20, 30, 40, 50
    buffer[0] = 10;
    buffer[1] = 20;
    buffer[2] = 30;
    buffer[3] = 40;
    buffer[4] = 50;

    call f.write(buffer, 5);
    call f.close();
    call print("Written 5 bytes: 10, 20, 30, 40, 50\n");

    # Read binary data
    if (call f.open(bin_filename, "r")) == 0 {
        call print("Error: Could not open binary file for reading\n");
        call exit(1);
    }

    # Clear buffer
    i = 0;
    loop {
        if i >= 100 {
            break;
        }
        buffer[i] = 0;
        i = i + 1;
    }

    call f.read(buffer, 5);
    call f.close();

    call print("Read bytes: ");
    # We can't easily print numbers with 'print' yet, so we verify logic
    if buffer[0] == 10 {
        if buffer[4] == 50 {
            call print("SUCCESS: Binary data matches.\n");
        } else {
            call print("FAILURE: Binary data mismatch.\n");
            call exit(1);
        }
    } else {
        call print("FAILURE: Binary data mismatch.\n");
        call exit(1);
    }

    # --- Cleanup ---
    call print("\n[6] Cleanup\n");
    if call removeFile(filename) == 0 {
        call print("Deleted text file.\n");
    } else {
        call print("Failed to delete text file.\n");
    }

    if call removeFile(bin_filename) == 0 {
        call print("Deleted binary file.\n");
    } else {
        call print("Failed to delete binary file.\n");
    }

    call print("\n--- Extended File I/O Test Complete ---\n");
}
