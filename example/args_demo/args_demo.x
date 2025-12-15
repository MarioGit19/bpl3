import [Console] from "std/io.x";

frame main(argc: u32, argv: **u8) ret u8 {
    call Console.log("Number of arguments (argc): ", argc);

    local i: u32 = 0;
    loop {
        if i >= argc {
            break;
        }
        local arg: *u8 = argv[i];
        call Console.log("Arg ", i, ": ", arg);
        i = i + 1;
    }
    return 0;
}
