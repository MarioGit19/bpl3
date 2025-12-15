import [Console] from "std/io.x";

frame main() ret u64 {
    call Console.log("--- Division Demo ---");

    # 1. Integer Division with / (Float Result)
    local a: u64 = 10;
    local b: u64 = 3;
    local res1: f64 = a / b;
    call Console.log("10 / 3 = ", res1);

    # 2. Integer Division with // (Integer Result)
    local res2: u64 = a // b;
    call Console.log("10 // 3 = ", res2);

    # 3. Float Division with / (Float Result)
    local x: f64 = 10.5;
    local y: f64 = 3.2;
    local res3: f64 = x / y;
    call Console.log("10.5 / 3.2 = ", res3);

    # 4. Float Division with // (Floor Result)
    local res4: f64 = x // y;
    call Console.log("10.5 // 3.2 = ", res4);

    # 5. Mixed Type Division
    # u64 / f64 -> f64
    local res5: f64 = a / y;
    call Console.log("10 / 3.2 = ", res5);

    # u64 // f64 -> f64 (floor)
    local res6: f64 = a // y;
    call Console.log("10 // 3.2 = ", res6);

    # 6. f32 Division
    local f1: f32 = 10.0;
    local f2: f32 = 4.0;
    local res7: f32 = f1 / f2;
    call Console.log("10.0 (f32) / 4.0 (f32) = ", res7);

    local res8: f32 = f1 // f2;
    call Console.log("10.0 (f32) // 4.0 (f32) = ", res8);

    return 0;
}
