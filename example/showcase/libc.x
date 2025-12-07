# Standard C Library Wrappers
import malloc, free, memset, memcpy, exit, rand, srand, time, getchar, system, fopen, fclose, fread, fwrite, fseek, ftell, rewind from "libc";
import [Console] from "std/io.x";

extern printf(fmt: *u8, ...);
extern malloc(size: u64) ret *u8;
extern free(ptr: *u8);
extern memset(ptr: *u8, val: i32, size: u64) ret *u8;
extern memcpy(dest: *u8, src: *u8, size: u64) ret *u8;
extern exit(code: i32);
extern rand() ret i32;
extern srand(seed: u32);
extern time(t: *u64) ret u64;
extern getchar() ret i32;
extern system(command: *u8) ret i32;

# File I/O
extern fopen(filename: *u8, mode: *u8) ret *u8; # Returns FILE*
extern fclose(stream: *u8) ret i32;
extern fread(ptr: *u8, size: u64, nmemb: u64, stream: *u8) ret u64;
extern fwrite(ptr: *u8, size: u64, nmemb: u64, stream: *u8) ret u64;
extern fseek(stream: *u8, offset: i64, whence: i32) ret i32;
extern ftell(stream: *u8) ret i64;
extern rewind(stream: *u8);

export printf;
export malloc;
export free;
export memset;
export memcpy;
export exit;
export rand;
export srand;
export time;
export getchar;
export system;
export fopen;
export fclose;
export fread;
export fwrite;
export fseek;
export ftell;
export rewind;
