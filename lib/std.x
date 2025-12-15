import [Console] from "io.x";
import sys_exit from "syscalls.x";
import popen, pclose, fread from "libc";
import std_malloc from "memory.x";
import [Option] from "option.x";
import [Result] from "result.x";
import [String] from "string.x";
import [Array] from "array.x";
import [Map] from "map.x";
import [Set] from "set.x";

frame print(s: *u8) {
    call Console.print_str(s);
}

frame exit(code: u64) {
    call sys_exit(code);
}

frame exec(cmd: *u8) ret *u8 {
    local fp: *u8 = call popen(cmd, "r");
    if fp == NULL {
        return NULL;
    }

    local size: u64 = 1024;
    local buffer: *u8 = call std_malloc(size);
    local total_read: u64 = 0;

    loop {
        local bytes_read: u64 = call fread(buffer + total_read, 1, size - total_read - 1, fp);
        if bytes_read == 0 {
            break;
        }
        total_read = total_read + bytes_read;
        # TODO: Realloc if needed
    }
    buffer[total_read] = 0;
    call pclose(fp);
    return buffer;
}

extern popen(command: *u8, mode: *u8) ret *u8;
extern pclose(stream: *u8) ret i32;
extern fread(ptr: *u8, size: u64, nmemb: u64, stream: *u8) ret u64;

export print;
export exit;
export exec;
export [Option];
export [Result];
export [String];
export [Array];
export [Map];
export [Set];
