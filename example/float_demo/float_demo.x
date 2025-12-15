import [Console] from "std/io.x";

struct Point {
    x: f64,
    y: f64,
}

struct Vector3 {
    x: f32,
    y: f32,
    z: f32,
}

frame add_f64(a: f64, b: f64) ret f64 {
    return a + b;
}

frame sub_f32(a: f32, b: f32) ret f32 {
    return a - b;
}

frame print_point(p: Point) {
    call Console.log("Point(", p.x, ", ", p.y, ")");
}

frame print_bool(b: u64) {
    if b {
        call Console.log("true");
    } else {
        call Console.log("false");
    }
}

frame test_arithmetic() {
    call Console.log("--- Arithmetic & Assignments ---");
    local a: f64 = 10.0;
    a += 5.0; # 15.0
    call Console.log("10.0 += 5.0 -> ", a);
    a -= 2.5; # 12.5
    call Console.log("15.0 -= 2.5 -> ", a);
    a *= 2.0; # 25.0
    call Console.log("12.5 *= 2.0 -> ", a);
    a /= 5.0; # 5.0
    call Console.log("25.0 /= 5.0 -> ", a);
}

frame test_mixed_types() {
    call Console.log("\n--- Mixed Types ---");
    local f: f64 = 2.5;
    local i: u64 = 10;
    local res1: f64 = f + i; # 12.5
    local res2: f64 = i + f; # 12.5
    call Console.log("2.5 + 10 = ", res1);
    call Console.log("10 + 2.5 = ", res2);

    local f32_val: f32 = 1.5;
    local res3: f64 = f32_val + f; # 4.0
    call Console.log("1.5 (f32) + 2.5 (f64) = ", res3);
}

frame test_comparisons() {
    call Console.log("\n--- Comparisons ---");
    local a: f64 = 10.5;
    local b: f64 = 10.5;
    local c: f64 = 20.0;

    call Console.print("10.5 == 10.5: ");
    call print_bool(a == b);

    call Console.print("10.5 != 20.0: ");
    call print_bool(a != c);

    call Console.print("10.5 < 20.0: ");
    call print_bool(a < c);

    call Console.print("20.0 > 10.5: ");
    call print_bool(c > a);
}

frame many_floats(f1: f64, f2: f64, f3: f64, f4: f64, f5: f64, f6: f64, f7: f64, f8: f64) {
    call Console.log("\n--- Many Arguments (Registers) ---");
    call Console.log("Sum: ", f1 + f2 + f3 + f4 + f5 + f6 + f7 + f8);
}

frame test_edge_cases() {
    call Console.log("\n--- Edge Cases ---");
    local z: f64 = 0.0;
    local nz: f64 = -0.0;
    call Console.log("0.0: ", z, ", -0.0: ", nz);

    local inf: f64 = 1.0 / 0.0;
    call Console.log("1.0 / 0.0 = ", inf);

    local nan: f64 = 0.0 / 0.0;
    call Console.log("0.0 / 0.0 = ", nan);

    local p1: f64 = 0.1;
    local p2: f64 = 0.2;
    local p3: f64 = p1 + p2;
    call Console.log("0.1 + 0.2 = ", p3);
}

frame main() ret u64 {
    call Console.log("--- Basic Operations ---");
    local a: f64 = 3.14;
    local b: f64 = 2.0;
    local c: f64 = a * b;
    local div_res: f64 = a / b;

    local d: f32 = 1.5;
    local e: f32 = 2.5;
    local f: f32 = d + e;
    local sub_res: f32 = call sub_f32(e, d);

    call Console.log("f64 mul: ", c, ", div: ", div_res);
    call Console.log("f32 add: ", f, ", sub: ", sub_res);

    call Console.log("\n--- Function Calls ---");
    local sum: f64 = call add_f64(10.5, 20.5);
    call Console.log("add_f64(10.5, 20.5): ", sum);

    call Console.log("\n--- Arrays ---");
    local arr: f64[3];
    arr[0] = 1.1;
    arr[1] = 2.2;
    arr[2] = 3.3;
    call Console.print("Array: [", arr[0], ", ", arr[1], ", ");
    call Console.print_f64(arr[2]);
    call Console.print_str("]\n");

    call Console.log("\n--- Structs ---");
    local p: Point = {x: 5.0, y: 10.0};
    call print_point(p);

    local v: Vector3 = {x: 1.0, y: 2.0, z: 3.0};
    call Console.log("Vector3: (", v.x, ", ", v.y, ", ", v.z, ")");

    call Console.log("\n--- Complex Calculation ---");
    local dist_sq: f64 = p.x * p.x + p.y * p.y;
    call Console.log("Point distance squared: ", dist_sq);

    call test_arithmetic();
    call test_mixed_types();
    call test_comparisons();
    call many_floats(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0);

    call Console.log("\n--- Negative Numbers ---");
    local neg: f64 = -5.5;
    call Console.log("Negative: ", neg);
    call Console.print("Abs val check: ");
    if neg < 0.0 {
        call Console.log("is negative");
    }

    call test_edge_cases();

    return 0;
}
