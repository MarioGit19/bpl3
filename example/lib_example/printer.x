import printf;

frame logNumber(n: u64) {
    call printf("Number: %d\n", n);
}
export logNumber;
