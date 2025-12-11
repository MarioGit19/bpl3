export [Result];

struct Result<T, E> {
    is_success: u64,
    ok: T,
    error: E,

    frame is_ok() ret u64 {
        return this.is_success;
    }

    frame is_err() ret u64 {
        return !this.is_success;
    }

    frame unwrap() ret T {
        return this.ok;
    }

    frame unwrap_err() ret E {
        return this.error;
    }

    frame unwrap_or(default: T) ret T {
        if this.is_success {
            return this.ok;
        }
        return default;
    }

    frame Ok(val: T) ret Result<T, E> {
        local res: Result<T, E>;
        res.is_success = 1;
        res.ok = val;
        return res;
    }

    frame Err(err: E) ret Result<T, E> {
        local res: Result<T, E>;
        res.is_success = 0;
        res.error = err;
        return res;
    }
}
