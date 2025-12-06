import fopen, fclose, fread, fwrite, fseek, ftell, rewind, remove, feof from "libc";

# External C function declarations
extern fopen(filename: *u8, mode: *u8) ret *u8;
extern fclose(stream: *u8) ret i32;
extern fread(ptr: *u8, size: u64, nmemb: u64, stream: *u8) ret u64;
extern fwrite(ptr: *u8, size: u64, nmemb: u64, stream: *u8) ret u64;
extern fseek(stream: *u8, offset: i64, whence: i32) ret i32;
extern ftell(stream: *u8) ret i64;
extern rewind(stream: *u8);
extern remove(filename: *u8) ret i32;
extern feof(stream: *u8) ret i32;

# Constants for fseek (as functions)
frame SEEK_SET() ret i32 { return 0; }
frame SEEK_CUR() ret i32 { return 1; }
frame SEEK_END() ret i32 { return 2; }

struct File {
    handle: *u8,
    mode: *u8,
    path: *u8,

    # Open a file with the given path and mode
    # Modes: "r", "w", "a", "r+", "w+", "a+"
    frame open(path: *u8, mode: *u8) ret u8 {
        this.path = path;
        this.mode = mode;
        this.handle = call fopen(path, mode);
        
        if this.handle == NULL {
            return 0; # Failure
        }
        return 1; # Success
    }

    # Close the file
    frame close() ret i32 {
        if this.handle == NULL {
            return 0;
        }
        local res: i32 = call fclose(this.handle);
        this.handle = NULL;
        return res;
    }

    # Read data into a buffer
    # Returns the number of bytes read
    frame read(buffer: *u8, size: u64) ret u64 {
        if this.handle == NULL {
            return 0;
        }
        return call fread(buffer, 1, size, this.handle);
    }

    # Write data from a buffer
    # Returns the number of bytes written
    frame write(buffer: *u8, size: u64) ret u64 {
        if this.handle == NULL {
            return 0;
        }
        return call fwrite(buffer, 1, size, this.handle);
    }

    # Write a null-terminated string
    frame writeString(str: *u8) ret u64 {
        if this.handle == NULL {
            return 0;
        }
        # Calculate length manually since we can't easily import strlen here without circular deps or duplication
        # But we can assume user passes valid string. 
        # Actually, let's just iterate.
        local len: u64 = 0;
        loop {
            if str[len] == 0 { break; }
            len = len + 1;
        }
        return call fwrite(str, 1, len, this.handle);
    }

    # Seek to a position
    frame seek(offset: i64, whence: i32) ret i32 {
        if this.handle == NULL {
            return cast<i32>(-1);
        }
        return call fseek(this.handle, offset, whence);
    }

    # Get current position
    frame tell() ret i64 {
        if this.handle == NULL {
            return -1;
        }
        return call ftell(this.handle);
    }

    # Rewind to the beginning
    frame rewind() {
        if this.handle != NULL {
            call rewind(this.handle);
        }
    }

    # Check if end of file
    frame isEOF() ret u8 {
        if this.handle == NULL {
            return 1;
        }
        if call feof(this.handle) != 0 {
            return 1;
        }
        return 0;
    }
}

# Static helper to delete a file
frame removeFile(path: *u8) ret i32 {
    return call remove(path);
}

export [File];
export removeFile;
export SEEK_SET;
export SEEK_CUR;
export SEEK_END;
