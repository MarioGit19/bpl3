# Standard Error Types

export [Error];
export [OptionUnwrapError];
export [ResultUnwrapError];
export [IOError];
export [CastError];
export [IndexOutOfBoundsError];
export [EmptyError];
export [NullAccessError];
export [DivisionByZeroError];
export [StackOverflowError];

struct Error {
    message: string,
    code: int,
}

struct OptionUnwrapError: Error {
}

struct ResultUnwrapError: Error {
}

struct IOError: Error {
}

struct CastError: Error {
}

struct IndexOutOfBoundsError: Error {
    index: int,
    size: int,
}

struct EmptyError: Error {
}

struct NullAccessError: Error {
    function: string,
    expression: string,
    __null_bit__: bool,
}

struct DivisionByZeroError: Error {
}

struct StackOverflowError: Error {
}
