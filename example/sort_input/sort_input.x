import scanf, malloc, free from "libc";
import [Console] from "std/io.x";

extern malloc(size: u64) ret *u8;

frame main() ret u64 {
    local n: u64 = 0;
    call Console.print("Enter number of elements: ");
    call scanf("%lu", &n);

    if n == 0 {
        call Console.log("No elements to sort.");
        return 0;
    }

    # Allocate memory for array
    local arr: *u64 = call malloc(n * 8);
    if arr == NULL {
        call Console.log("Memory allocation failed.");
        return 1;
    }

    call Console.log("Enter", n, "numbers: ");
    local i: u64 = 0;
    loop {
        if i >= n {
            break;
        }
        call scanf("%lu", &arr[i]);
        i = i + 1;
    }

    # Bubble Sort Algorithm
    # Time Complexity: O(n^2)
    local j: u64 = 0;
    i = 0;
    loop {
        if i >= n - 1 {
            break;
        }
        j = 0;
        loop {
            if j >= n - i - 1 {
                break;
            }

            # Swap if the element found is greater than the next element
            if arr[j] > arr[j + 1] {
                local temp: u64 = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
            j = j + 1;
        }
        i = i + 1;
    }

    call Console.log("Sorted numbers: ");
    i = 0;
    loop {
        if i >= n {
            break;
        }
        call Console.print(arr[i]);
        call Console.print(" ");
        i = i + 1;
    }
    call Console.println();

    call free(arr);
    return 0;
}
