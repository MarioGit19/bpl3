import [File], removeFile from "std/file.x";
import print_str, println from "std/io.x";
import streq from "std/string.x";

frame main() {
    call print_str("--- Testing File I/O ---\n");

    local filename: *u8 = "test_file.txt";
    local file: File;

    # Test Write
    call print_str("Opening file for writing...\n");
    if (call file.open(filename, "w")) == 0 {
        call print_str("Failed to open file for writing\n");
        return;
    }

    call print_str("Writing data...\n");
    call file.writeString("Hello File I/O!\n");
    call file.writeString("Second line.\n");

    call file.close();
    call print_str("File closed.\n");

    # Test Read
    call print_str("Opening file for reading...\n");
    if (call file.open(filename, "r")) == 0 {
        call print_str("Failed to open file for reading\n");
        return;
    }

    local buffer: u8[100];
    # Zero buffer
    local i: u64 = 0;
    loop {
        if i >= 100 {
            break;
        }
        buffer[i] = 0;
        i = i + 1;
    }

    call print_str("Reading data...\n");
    local bytes_read: u64 = call file.read(cast<*u8>(buffer), 99);
    call print_str("Read ");
    call print_str(" bytes:\n");
    call print_str(cast<*u8>(buffer));

    call file.close();

    # Cleanup
    call print_str("Removing file...\n");
    call removeFile(filename);

    call print_str("--- File Test Complete ---\n");
}
