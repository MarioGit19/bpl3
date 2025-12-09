struct Box<T> {
    val: T,
}

frame main() ret void {
    local b1: Box<int>;
    local b2: Box<float>;
    
    # Invalid assignment due to generic mismatch
    local b3: Box<int> = cast<Box<Box<Box<int>>>>(b1);
}
