# Option<T> standard library

export [Option];

struct Option<T> {
    has: bool,
    value: T,
    frame some(value: T) ret Option<T> {
        local o: Option<T>;
        o.has = true;
        o.value = value;
        return o;
    }

    frame none() ret Option<T> {
        local o: Option<T>;
        o.has = false;
        return o;
    }

    frame isSome(this: *Option<T>) ret bool {
        if (this.has) {
            return true;
        }
        return false;
    }

    frame isNone(this: *Option<T>) ret bool {
        if (this.has) {
            return false;
        }
        return true;
    }

    frame unwrap(this: *Option<T>) ret T {
        if (this.has) {
            return this.value;
        }
        # Using error code 100 for unwrap on None
        throw 100;
    }

    frame unwrapOr(this: *Option<T>, defaultValue: T) ret T {
        if (this.has) {
            return this.value;
        }
        return defaultValue;
    }

    # Maps Option<T> to Option<U> by applying a function
    # Note: Cannot implement as generic function pointer in current BPL3
    # Users should call this manually with their mapping logic

    # Operator overloading: Equality comparison
    # Two Options are equal if both are None or both are Some with equal values
    # Note: Requires T to have __eq__ or be primitive
    frame __eq__(this: *Option<T>, other: Option<T>) ret bool {
        if (this.has && other.has) {
            # Both Some - compare values (works for primitives)
            return this.value == other.value;
        }
        if (!this.has && !other.has) {
            # Both None
            return true;
        }
        # One Some, one None
        return false;
    }

    # Operator overloading: Inequality comparison
    frame __ne__(this: *Option<T>, other: Option<T>) ret bool {
        return !this.__eq__(other);
    }
}
