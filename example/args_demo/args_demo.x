import printf from "libc";

frame main(argc: u32, argv: **u8) ret u8 {
    call printf("Number of arguments (argc): %d\n", argc);

    local i: u32 = 0;
    loop {
        if i >= argc {
            break;
        }
        local arg: *u8 = argv[i];
        call printf("Arg %d: %s\n", i, arg);
        i = i + 1;
    }
    return 0;
}
