# Option<T> standard library

export [Option];

enum Option<T> {
    Some(T),
    None,

    frame isSome(this: Option<T>) ret bool {
        return match<Option.Some>(this);
    }

    frame isNone(this: Option<T>) ret bool {
        return match<Option.None>(this);
    }

    frame panic() ret T {
        throw 100;
    }

    frame unwrap(this: Option<T>) ret T {
        return match (this) {
            Option.Some(val) => val,
            Option.None => Option<T>.panic(),
        };
    }

    frame unwrapOr(this: Option<T>, defaultValue: T) ret T {
        return match (this) {
            Option.Some(val) => val,
            Option.None => defaultValue,
        };
    }

    frame __eq__(this: Option<T>, other: Option<T>) ret bool {
        return match (this) {
            Option.Some(v1) => match (other) {
                Option.Some(v2) => v1 == v2,
                Option.None => false,
            },
            Option.None => match (other) {
                Option.Some(_) => false,
                Option.None => true,
            },
        };
    }

    frame __ne__(this: Option<T>, other: Option<T>) ret bool {
        return !(this.__eq__(other));
    }
}
