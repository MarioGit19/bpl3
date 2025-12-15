import exec from "std";
import sprintf from "libc";
import [Console] from "std/io.x";
import std_malloc, std_free from "std/memory.x";

frame main() ret u64 {
    call Console.log("=== Exec Demo ===");

    # 1. Simple command execution
    call Console.log("\n[1] Running 'whoami'...");
    local output1: *u8 = call exec("whoami");
    if output1 != NULL {
        call Console.print("Output: ", output1);
        call std_free(output1);
    } else {
        call Console.log("Failed to execute command.");
    }

    # 2. Dynamic command with sprintf
    call Console.log("\n[2] Running 'ls -la' on current directory...");

    # Allocate buffer for command string
    local cmd_buffer: *u8 = call std_malloc(128);
    call sprintf(cmd_buffer, "ls -la %s", ".");

    local output2: *u8 = call exec(cmd_buffer);
    if output2 != NULL {
        call Console.print("Output:\n", output2);
        call std_free(output2);
    }

    call std_free(cmd_buffer);

    # 3. Command with pipes
    call Console.log("\n[3] Running 'echo \"Hello Pipe\" | tr a-z A-Z'...");
    local output3: *u8 = call exec("echo \"Hello Pipe\" | tr a-z A-Z");
    if output3 != NULL {
        call Console.print("Output: ", output3);
        call std_free(output3);
    }

    return 0;
}
