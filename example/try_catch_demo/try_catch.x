import [Console] from "std/io.x";

struct MyError {
    code: i32,
}

struct OtherError {
    msg: *u8,
}

frame thrower(val: i32) {
    if val < 0 {
        call Console.log("Throwing MyError...");
        throw cast<MyError>({code: val});
    }
    if val == 0 {
        call Console.log("Throwing OtherError...");
        throw cast<OtherError>({msg: "Zero is not allowed"});
    }
    call Console.log("Value is good: ", val);
}

frame main() ret i32 {
    call Console.log("Starting try/catch demo...");

    call Console.log("\n--- Test 1: Catch MyError ---");
    try {
        call thrower(-1);
    } catch (e: MyError) {
        call Console.log("Caught MyError with code: ", e.code);
    }

    call Console.log("\n--- Test 2: Catch OtherError ---");
    try {
        call thrower(0);
    } catch (e: OtherError) {
        call Console.log("Caught OtherError with msg: ", e.msg);
    }

    call Console.log("\n--- Test 3: No Exception ---");
    try {
        call thrower(10);
    } catch (e: MyError) {
        call Console.log("Should not be here (MyError)");
    } catch (e: OtherError) {
        call Console.log("Should not be here (OtherError)");
    }

    call Console.log("\n--- Test 4: Multiple Catches (Match First) ---");
    try {
        call thrower(-5);
    } catch (e: MyError) {
        call Console.log("Caught MyError: ", e.code);
    } catch (e: OtherError) {
        call Console.log("Caught OtherError");
    }

    call Console.log("\n--- Test 5: Multiple Catches (Match Second) ---");
    try {
        call thrower(0);
    } catch (e: MyError) {
        call Console.log("Caught MyError");
    } catch (e: OtherError) {
        call Console.log("Caught OtherError: ", e.msg);
    }

    call Console.log("\nDone.");
    return 0;
}
