# Result<T, E> standard library

export [Result];

struct Result<T, E> {
    ok: bool,
    value: T,
    error: E,
    frame Ok(value: T) ret Result<T, E> {
        local r: Result<T, E>;
        r.ok = true;
        r.value = value;
        return r;
    }

    frame Err(error: E) ret Result<T, E> {
        local r: Result<T, E>;
        r.ok = false;
        r.error = error;
        return r;
    }

    frame isOk(this: *Result<T, E>) ret bool {
        if (this.ok) {
            return true;
        }
        return false;
    }

    frame isErr(this: *Result<T, E>) ret bool {
        if (this.ok) {
            return false;
        }
        return true;
    }

    frame unwrap(this: *Result<T, E>) ret T {
        if (this.ok) {
            return this.value;
        }
        # Throw the error object/value for handling by caller
        throw this.error;
    }

    frame unwrapOr(this: *Result<T, E>, defaultValue: T) ret T {
        if (this.ok) {
            return this.value;
        }
        return defaultValue;
    }

    frame unwrapErr(this: *Result<T, E>) ret E {
        return this.error;
    }

    # Operator overloading: Equality comparison
    # Two Results are equal if both Ok with equal values or both Err with equal errors
    frame __eq__(this: *Result<T, E>, other: Result<T, E>) ret bool {
        if (this.ok && other.ok) {
            # Both Ok - compare values
            return this.value == other.value;
        }
        if (!this.ok && !other.ok) {
            # Both Err - compare errors
            return this.error == other.error;
        }
        # One Ok, one Err
        return false;
    }

    # Operator overloading: Inequality comparison
    frame __ne__(this: *Result<T, E>, other: Result<T, E>) ret bool {
        return !this.__eq__(other);
    }
}
