import sys_open, sys_close, sys_read, sys_write, sys_lseek, sys_unlink from "std/syscalls.x";
import strcmp from "std/string.x";
import print_int, println, print_str from "std/io.x";

# File flags
frame O_RDONLY() ret u64 {
    return 0;
}
frame O_WRONLY() ret u64 {
    return 1;
}
frame O_RDWR() ret u64 {
    return 2;
}
frame O_CREAT() ret u64 {
    return 64;
}
frame O_TRUNC() ret u64 {
    return 512;
}
frame O_APPEND() ret u64 {
    return 1024;
}

# Seek constants
frame SEEK_SET() ret u64 {
    return 0;
}
frame SEEK_CUR() ret u64 {
    return 1;
}
frame SEEK_END() ret u64 {
    return 2;
}

struct File {
    fd: u64,
    path: *u8,
    mode: *u8,
    is_open: u8,

    frame open(path: *u8, mode: *u8) ret u8 {
        # Open a file with the given path and mode
        # Modes: "r", "w", "a", "r+", "w+", "a+"

        this.path = path;
        this.mode = mode;

        local flags: u64 = 0;
        local mode_val: u64 = 438; # 0666 in octal (rw-rw-rw-)

        if call strcmp(mode, "r") == 0 {
            flags = call O_RDONLY();
        } else if call strcmp(mode, "w") == 0 {
            flags = call O_WRONLY() | call O_CREAT() | call O_TRUNC();
        } else if call strcmp(mode, "a") == 0 {
            flags = call O_WRONLY() | call O_CREAT() | call O_APPEND();
        } else if call strcmp(mode, "r+") == 0 {
            flags = call O_RDWR();
        } else if call strcmp(mode, "w+") == 0 {
            flags = call O_RDWR() | call O_CREAT() | call O_TRUNC();
        } else if call strcmp(mode, "a+") == 0 {
            flags = call O_RDWR() | call O_CREAT() | call O_APPEND();
        } else {
            return 0; # Invalid mode
        }

        local res: u64 = call sys_open(path, flags, mode_val);

        # Check for error (negative return value, but u64 so check if > very large number)
        # Linux returns -errno on error. Max errno is 4095.
        # So if res > -4096 (unsigned comparison), it's an error.
        # -4096 in u64 is 0xFFFFFFFFFFFFF000

        if res > 0xFFFFFFFFFFFFF000 {
            call print_int(cast<i64>(res));
            call println();
            this.is_open = 0;
            return 0;
        }

        this.fd = res;
        this.is_open = 1;
        return 1;
    }

    frame close() ret u64 {
        # Close the file

        if this.is_open == 0 {
            return 0;
        }
        local res: u64 = call sys_close(this.fd);
        this.is_open = 0;
        return res;
    }

    frame read(buffer: *u8, size: u64) ret u64 {
        # Read data into a buffer
        # Returns the number of bytes read

        if this.is_open == 0 {
            return 0;
        }
        return call sys_read(this.fd, buffer, size);
    }

    frame write(buffer: *u8, size: u64) ret u64 {
        # Write data from a buffer
        # Returns the number of bytes written

        if this.is_open == 0 {
            return 0;
        }
        return call sys_write(this.fd, buffer, size);
    }

    frame writeString(str: *u8) ret u64 {
        # Write a null-terminated string

        if this.is_open == 0 {
            return 0;
        }
        local len: u64 = 0;
        loop {
            if str[len] == 0 {
                break;
            }
            len = len + 1;
        }
        return call sys_write(this.fd, str, len);
    }

    frame seek(offset: u64, whence: u64) ret u64 {
        # Seek to a position

        if this.is_open == 0 {
            return 0;
        }
        return call sys_lseek(this.fd, offset, whence);
    }

    frame tell() ret u64 {
        # Get current position

        if this.is_open == 0 {
            return 0;
        }
        return call sys_lseek(this.fd, 0, call SEEK_CUR());
    }

    frame rewind() {
        # Rewind to the beginning

        if this.is_open != 0 {
            call sys_lseek(this.fd, 0, call SEEK_SET());
        }
    }
}

# Static helper to delete a file
frame removeFile(path: *u8) ret u64 {
    return call sys_unlink(path);
}

export [File];
export removeFile;
export SEEK_SET;
export SEEK_CUR;
export SEEK_END;
