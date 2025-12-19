# Comprehensive example: Pattern guards + Type matching

extern printf(fmt: string, ...) ret int;
extern malloc(size: u64) ret *void;

enum Result<T, E> {
    Ok(T),
    Err(E),
}

frame process_result(r: Result<int, string>) ret int {
    # Use pattern guards to handle different value ranges
    return match (r) {
        Result<int, string>.Ok(value) if value > 100 => 1,
        Result<int, string>.Ok(value) if value > 0 => 2,
        Result<int, string>.Ok(value) => 3,
        Result<int, string>.Err(msg) => -1,
    };
}

frame check_and_process(r: Result<int, string>) ret int {
    # Use match<Type> to check variant before processing
    if (match<Result.Ok>(r)) {
        printf("Result is Ok\n");
        return process_result(r);
    } else {
        printf("Result is Err\n");
        return 0;
    }
}

frame main() ret int {
    # Test with various values
    local r1: Result<int, string> = Result<int, string>.Ok(150);
    local r2: Result<int, string> = Result<int, string>.Ok(42);
    local r3: Result<int, string> = Result<int, string>.Ok(-10);
    local r4: Result<int, string> = Result<int, string>.Err("Something went wrong");

    printf("=== Test 1 ===\n");
    local code1: int = check_and_process(r1);

    printf("\n=== Test 2 ===\n");
    local code2: int = check_and_process(r2);

    printf("\n=== Test 3 ===\n");
    local code3: int = check_and_process(r3);

    printf("\n=== Test 4 ===\n");
    local code4: int = check_and_process(r4);

    printf("\nReturn codes: %d, %d, %d, %d\n", code1, code2, code3, code4);

    return code1 + code2 + code3 + code4;
}
