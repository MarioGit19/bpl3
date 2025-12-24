# Complex match patterns with multiple enum types

enum Operation {
    Add,
    Subtract,
    Multiply,
    Divide,
}

enum Comparison {
    Equal,
    Less,
    Greater,
}

frame calculate(op: Operation, a: int, b: int) ret int {
    return match (op) {
        Operation.Add => a + b,
        Operation.Subtract => a - b,
        Operation.Multiply => a * b,
        Operation.Divide => a / b,
    };
}

frame compare(cmp: Comparison, result: int, expected: int) ret int {
    local check: int = match (cmp) {
        Comparison.Equal => result - expected,
        Comparison.Less => expected - result,
        Comparison.Greater => result - expected,
    };

    if (check == 0) {
        return 99;
    } else {
        return 0;
    }
}

frame main() ret int {
    local result: int = calculate(Operation.Add, 5, 3);
    local test: int = compare(Comparison.Equal, result, 8);
    return test;
}
