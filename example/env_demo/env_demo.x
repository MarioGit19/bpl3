import getenv from "libc";
import [Console] from "std/io.x";
extern getenv(name: *u8) ret *u8;

frame main(_argc: u32, _argv: **u8, envp: **u8) ret u8 {
    call Console.log("--- Environment Variables (from main arg) ---");

    local i: u32 = 0;
    loop {
        local env_str: *u8 = envp[i];
        if env_str == NULL {
            break;
        }
        # Only print first 5 to avoid spamming
        if i < 5 {
            call Console.log("Env[", i, "]: ", env_str);
        }
        i = i + 1;
    }
    call Console.log("... and", i - 5, "more.");

    call Console.log("\n--- Specific Environment Variable (getenv) ---");
    local path: *u8 = call getenv("PATH");
    if path != NULL {
        call Console.log("PATH: ", path);
    } else {
        call Console.log("PATH not found.");
    }

    local user: *u8 = call getenv("USER");
    if user != NULL {
        call Console.log("USER: ", user);
    }

    return 0;
}
