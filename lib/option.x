export [Option];

struct Option<T> {
    has_value: u64,
    value: T,

    frame is_some() ret u64 {
        return this.has_value;
    }

    frame is_none() ret u64 {
        return !this.has_value;
    }

    frame unwrap() ret T {
        if !this.has_value {
            throw "Called unwrap on a None value";
        }
        return this.value;
    }

    frame unwrap_or(default: T) ret T {
        if this.has_value {
            return this.value;
        }
        return default;
    }

    frame Some(val: T) ret Option<T> {
        local opt: Option<T>;
        opt.has_value = 1;
        opt.value = val;
        return opt;
    }

    frame None() ret Option<T> {
        local opt: Option<T>;
        opt.has_value = 0;
        return opt;
    }
}
