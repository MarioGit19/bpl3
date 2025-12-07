import printf, malloc, free, rand, srand, time from "libc";

frame main() ret u64 {
    local size: u64 = 5000;
    call printf("Bubble sorting array of size %d...\n", size);

    local arr: *u64 = cast<*u64>(call malloc(size * 8));

    # Initialize with random values
    call srand(call time(0));
    local i: u64 = 0;
    loop {
        if i >= size {
            break;
        }
        arr[i] = cast<u64>(call rand()) % 10000;
        i = i + 1;
    }

    # Bubble Sort
    local swapped: u64 = 1;
    loop {
        if swapped == 0 {
            break;
        }
        swapped = 0;
        local j: u64 = 0;
        loop {
            if j >= size - 1 {
                break;
            }
            if arr[j] > arr[j + 1] {
                local temp: u64 = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
                swapped = 1;
            }
            j = j + 1;
        }
    }

    call printf("Done.\n");
    call free(arr);
    return 0;
}
