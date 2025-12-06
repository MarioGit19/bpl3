frame min_u64(a: u64, b: u64) ret u64 {
    if a < b {
        return a;
    }
    return b;
}

frame max_u64(a: u64, b: u64) ret u64 {
    if a > b {
        return a;
    }
    return b;
}

frame clamp_u64(val: u64, min: u64, max: u64) ret u64 {
    if val < min {
        return min;
    }
    if val > max {
        return max;
    }
    return val;
}

frame pow_u64(base: u64, exp: u64) ret u64 {
    local result: u64 = 1;
    loop {
        if exp == 0 {
            break;
        }
        if exp % 2 == 1 {
            result = result * base;
        }
        base = base * base;
        exp = exp / 2;
    }
    return result;
}

frame abs_i64(n: i64) ret i64 {
    if n < 0 {
        return 0 - n;
    }
    return n;
}

frame gcd(a: u64, b: u64) ret u64 {
    local temp: u64;
    loop {
        if b == 0 {
            break;
        }
        temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

frame lcm(a: u64, b: u64) ret u64 {
    if a == 0 || b == 0 {
        return 0;
    }
    return a * b // call gcd(a, b);
}

export min_u64;
export max_u64;
export clamp_u64;
export pow_u64;
export abs_i64;
export gcd;
export lcm;
