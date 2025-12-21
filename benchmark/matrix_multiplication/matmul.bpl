extern printf(fmt: string, ...);
extern malloc(size: int) ret *void;
extern free(ptr: *void);

frame main() ret int {
    local size: int = 300;
    local total_elements: int = size * size;
    local bytes: int = total_elements * 8; # 8 bytes per int (64-bit)

    local a: *int = cast<*int>(malloc(bytes));
    local b: *int = cast<*int>(malloc(bytes));
    local c: *int = cast<*int>(malloc(bytes));

    # Initialize matrices
    local i: int = 0;
    loop (i < size) {
        local j: int = 0;
        loop (j < size) {
            local idx: int = (i * size) + j;
            *(a + idx) = i + j;
            *(b + idx) = i - j;
            j = j + 1;
        }
        i = i + 1;
    }

    # Multiply: C = A * B
    i = 0;
    loop (i < size) {
        local j: int = 0;
        loop (j < size) {
            local sum: int = 0;
            local k: int = 0;
            loop (k < size) {
                # sum += a[i][k] * b[k][j];
                sum = sum + (*(a + ((i * size) + k)) * *(b + ((k * size) + j)));
                k = k + 1;
            }
            *(c + ((i * size) + j)) = sum;
            j = j + 1;
        }
        i = i + 1;
    }

    # Verify (sum of all elements in C)
    local result_sum: int = 0;
    i = 0;
    loop (i < total_elements) {
        result_sum = result_sum + *(c + i);
        i = i + 1;
    }

    printf("Matrix %dx%d sum: %ld\n", size, size, result_sum);

    free(cast<*void>(a));
    free(cast<*void>(b));
    free(cast<*void>(c));

    return 0;
}
