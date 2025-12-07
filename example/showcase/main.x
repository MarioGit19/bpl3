import [Vector3], vec3_create, vec3_add, vec3_dot, vec3_normalize from "./math.x";
import sb_create, sb_append, sb_to_string, sb_destroy, [StringBuilder] from "./string.x";
import list_create, list_push, list_pop, list_destroy, [LinkedList] from "./structures.x";
import vm_create, vm_run, vm_destroy, [VM] from "./vm.x";

import [Console] from "std/io.x";
import printf, malloc, free from "./libc.x";

frame main() ret i32 {
    call Console.log("=== BPL Showcase ===");

    # 1. Math & Structs
    call Console.log("\n--- Math & Structs ---");
    local v1: *Vector3 = call vec3_create(1.0, 2.0, 3.0);
    local v2: *Vector3 = call vec3_create(4.0, 5.0, 6.0);
    local v3: *Vector3 = call vec3_add(v1, v2);

    call Console.log("v1: (", v1.x, ", ", v1.y, ", ", v1.z, ")");
    call Console.log("v2: (", v2.x, ", ", v2.y, ", ", v2.z, ")");
    call Console.log("v1 + v2: (", v3.x, ", ", v3.y, ", ", v3.z, ")");

    local dot: f64 = call vec3_dot(v1, v2);
    call Console.log("v1 . v2: ", dot);

    call vec3_normalize(v3);
    call Console.log("Normalized v3: (", v3.x, ", ", v3.y, ", ", v3.z, ")");
    call free(v1);
    call free(v2);

    # 2. Strings
    call Console.log("\n--- Strings ---");
    local sb: *StringBuilder = call sb_create();
    if sb == 0 {
        call Console.log("sb is null!");
        return 1;
    }

    call sb_append(sb, "Hello, ");
    call sb_append(sb, "World!");
    call sb_append(sb, " This is BPL.");

    local res: *u8 = call sb_to_string(sb);
    call Console.log("StringBuilder result: ", res);

    call free(res);
    call sb_destroy(sb);

    # 3. Data Structures (LinkedList)
    call Console.log("\n--- Data Structures ---");
    local list: *LinkedList = call list_create();
    call list_push(list, "Item 1");
    call list_push(list, "Item 2");
    call list_push(list, "Item 3");

    call Console.log("Popping items: ");
    local item: *u8 = call list_pop(list);
    loop {
        if item == 0 {
            break;
        }
        call Console.log("  ", item);
        item = call list_pop(list);
    }

    call list_destroy(list);

    # 4. Virtual Machine
    call Console.log("\n--- Virtual Machine ---");
    # Program: PUSH 10, PUSH 20, ADD, PRINT, HALT
    local prog_size: u64 = 8;
    local program: *i32 = call malloc(prog_size * 4);

    # Manual array initialization (since we don't have array literals for pointers yet easily)
    local p_ptr: *i32 = program;
    *p_ptr = 1; # PUSH
    p_ptr = p_ptr + 1;
    *p_ptr = 10;
    p_ptr = p_ptr + 1;
    *p_ptr = 1; # PUSH
    p_ptr = p_ptr + 1;
    *p_ptr = 20;
    p_ptr = p_ptr + 1;
    *p_ptr = 3; # ADD
    p_ptr = p_ptr + 1;
    *p_ptr = 7; # PRINT
    p_ptr = p_ptr + 1;
    *p_ptr = 8; # HALT
    p_ptr = p_ptr + 1;
    *p_ptr = 0; # Padding

    local vm: *VM = call vm_create(program, prog_size);
    call vm_run(vm);
    call vm_destroy(vm);
    call free(program);

    call Console.log("\n=== Showcase Complete ===");
    return 0;
}
