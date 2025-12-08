frame add(a: i32, b: i32) ret i32 {
    return a + b;
}

frame multiply(x: i32, y: i32) ret i32 {
    local result: i32 = x * y;
    return result;
}

frame main() ret i32 {
    local x: i32 = 10;
    local y: i32 = 20;
    local sum: i32 = call add(x, y);
    local product: i32 = call multiply(sum, 2);

    if product > 50 {
        local doubled: i32 = product * 2;
        return doubled;
    } else {
        return product;
    }
}
