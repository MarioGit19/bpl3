import printf, malloc, free from "libc";

frame main() ret u64 {
    local N: u64 = 500;
    call printf("Matrix multiplication %dx%d...\n", N, N);

    local size: u64 = N * N * 8;
    local A: *u64 = cast<*u64>(call malloc(size));
    local B: *u64 = cast<*u64>(call malloc(size));
    local C: *u64 = cast<*u64>(call malloc(size));

    # Initialize
    local i: u64 = 0;
    loop {
        if i >= N * N {
            break;
        }
        A[i] = i % 10;
        B[i] = i % 10;
        C[i] = 0;
        i = i + 1;
    }

    # Multiply
    local row: u64 = 0;
    loop {
        if row >= N {
            break;
        }
        local col: u64 = 0;
        loop {
            if col >= N {
                break;
            }
            local sum: u64 = 0;
            local k: u64 = 0;
            loop {
                if k >= N {
                    break;
                }
                sum = sum + A[row * N + k] * B[k * N + col];
                k = k + 1;
            }
            C[row * N + col] = sum;
            col = col + 1;
        }
        row = row + 1;
    }

    call printf("Done. C[0] = %llu\n", C[0]);

    call free(A);
    call free(B);
    call free(C);
    return 0;
}
