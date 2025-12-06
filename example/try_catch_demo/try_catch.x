extern printf(fmt: *u8, ...) ret i32;

struct MyError {
    code: i32,
}

struct OtherError {
    msg: *u8,
}

frame thrower(val: i32) {
    if val < 0 {
        call printf("Throwing MyError...\n");
        throw cast<MyError>({code: val});
    }
    if val == 0 {
        call printf("Throwing OtherError...\n");
        throw cast<OtherError>({msg: "Zero is not allowed"});
    }
    call printf("Value is good: %d\n", val);
}

frame main() ret i32 {
    call printf("Starting try/catch demo...\n");

    call printf("\n--- Test 1: Catch MyError ---\n");
    try {
        call thrower(-1);
    } catch (e: MyError) {
        call printf("Caught MyError with code: %d\n", e.code);
    }

    call printf("\n--- Test 2: Catch OtherError ---\n");
    try {
        call thrower(0);
    } catch (e: OtherError) {
        call printf("Caught OtherError with msg: %s\n", e.msg);
    }

    call printf("\n--- Test 3: No Exception ---\n");
    try {
        call thrower(10);
    } catch (e: MyError) {
        call printf("Should not be here (MyError)\n");
    } catch (e: OtherError) {
        call printf("Should not be here (OtherError)\n");
    }

    call printf("\n--- Test 4: Multiple Catches (Match First) ---\n");
    try {
        call thrower(-5);
    } catch (e: MyError) {
        call printf("Caught MyError: %d\n", e.code);
    } catch (e: OtherError) {
        call printf("Caught OtherError\n");
    }

    call printf("\n--- Test 5: Multiple Catches (Match Second) ---\n");
    try {
        call thrower(0);
    } catch (e: MyError) {
        call printf("Caught MyError\n");
    } catch (e: OtherError) {
        call printf("Caught OtherError: %s\n", e.msg);
    }

    call printf("\nDone.\n");
    return 0;
}
