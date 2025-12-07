import [Console] from "std/io.x";

frame main() ret u64 {
    local f: f64 = 10.5;
    local i: u64 = 2;

    local res1: f64 = f + i; # 12.5
    local res2: f64 = i + f; # 12.5

    local f32_val: f32 = 5.5;
    local res3: f64 = f32_val + i; # 7.5

    local f2: f64 = 1.5;
    local res4: f64 = f + f2; # 12.0

    call Console.log("res1: ", res1, ", res2: ", res2, ", res3: ", res3, ", res4: ", res4);

    return 0;
}
