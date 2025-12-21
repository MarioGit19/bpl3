extern printf(fmt: string, ...);
extern malloc(size: int) ret *void;
extern free(ptr: *void);

frame main() ret int {
    local limit: int = 10000000;
    local size: int = limit + 1;
    # Allocate memory for bool array (1 byte per bool)
    local is_prime: *bool = cast<*bool>(malloc(size));

    # Initialize
    local i: int = 0;
    loop (i < size) {
        *(is_prime + i) = true;
        i = i + 1;
    }

    *(is_prime + 0) = false;
    *(is_prime + 1) = false;

    local p: int = 2;
    loop ((p * p) <= limit) {
        if (*(is_prime + p)) {
            local j: int = p * p;
            loop (j <= limit) {
                *(is_prime + j) = false;
                j = j + p;
            }
        }
        p = p + 1;
    }

    local count: int = 0;
    i = 0;
    loop (i <= limit) {
        if (*(is_prime + i)) {
            count = count + 1;
        }
        i = i + 1;
    }

    printf("Primes up to %d: %d\n", limit, count);
    free(cast<*void>(is_prime));
    return 0;
}
