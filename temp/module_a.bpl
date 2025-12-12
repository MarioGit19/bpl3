# Comprehensive import/export test
# Define some functions
frame greet(name: *u8) {
    # Would print if we had IO
}
frame add(a: int, b: int) ret int {
    return a + b;
}
# Define some types
struct Person {
    age: int,
    height: int,
}
struct Car {
    speed: int,
    weight: int,
}
type Age = int;
# Export only specific items
export greet;
export add;
export [Person];
export [Age];

# Note: Car is NOT exported, so it should not be importable
