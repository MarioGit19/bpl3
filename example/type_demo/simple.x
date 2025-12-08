frame add(a: i32, b: i32) ret i32 {
    return a + b;
}

frame multiply(x: i32, y: i32) ret i32 {
    local result: i32 = x * y;
    return result;
}

struct Resiii {
    value: i32,

    frame get_value() ret i32 {
        return this.value;
    }

    frame get_this() ret *Resiii {
        return this;
    }
}

frame main() ret i32 {
    local x: i32 = 10;
    local y: i32 = 20;
    local sum: i32 = call add(x, y);
    local product: i32 = call multiply(sum, 2);

    local result: i32 = product;
    if product > 50 {
        result = product * 2;
    }

    local r: Resiii;
    r.value = result * 2;

    result = (call call call r.get_this().get_this().get_value());

    return result;
}
