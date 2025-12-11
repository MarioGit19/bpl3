struct Math {

    frame min(a: u64, b: u64) ret u64 {
        if a < b {
            return a;
        }
        return b;
    }

    frame max(a: u64, b: u64) ret u64 {
        if a > b {
            return a;
        }
        return b;
    }

    frame clamp(val: u64, min: u64, max: u64) ret u64 {
        if val < min {
            return min;
        }
        if val > max {
            return max;
        }
        return val;
    }

    frame pow(base: u64, exp: u64) ret u64 {
        local result: u64 = 1;
        loop {
            if exp == 0 {
                break;
            }
            if exp % 2 == 1 {
                result = result * base;
            }
            base = base * base;
            exp = cast<u64>(exp / 2);
        }
        return result;
    }

    frame abs(n: i64) ret i64 {
        if n < 0 {
            return 0 - n;
        }
        return n;
    }

    frame gcd(a: u64, b: u64) ret u64 {
        local temp: u64;
        loop {
            if b == 0 {
                return a;
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
        local gcd_val: u64 = Math.gcd(a, b);
        return cast<u64>(a * b / gcd_val);
    }

    frame random(min: u64, max: u64) ret u64 {
        local rnd: u64 = 0;
        asm {
            rdrand rax;
            mov [(rnd)], rax;
        }

        if max <= min {
            return min;
        }

        local result: u64 = rnd % (max - min) + min;
        return result;
    }
}

export [Math];
