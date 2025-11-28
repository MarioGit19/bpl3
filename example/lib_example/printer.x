import printf;

frame logNumber(n: u64) {
    call printf("Number: %d\n", n);
}
export logNumber;

global value: u64 = 69;
frame logGlobal() {
    if value == 69 {
      call printf("NICE\n");
    } else {
      call printf("NOT NICE\n");
    }
}
export logGlobal;