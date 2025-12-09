frame main() ret void {
    local i: int = 5;
    local f: float = 3.14;
    
    # Invalid assignment
    # local j: int = f; # Error: float to int
    
    # Invalid cast
    struct A {}
    struct B {}
    local a: A;
    local b: B = cast<B>(a); # Error: unsafe cast
}
