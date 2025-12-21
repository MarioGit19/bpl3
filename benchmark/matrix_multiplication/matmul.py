def main():
    size = 300

    # Initialize
    a = [0] * (size * size)
    b = [0] * (size * size)
    c = [0] * (size * size)

    for i in range(size):
        for j in range(size):
            idx = i * size + j
            a[idx] = i + j
            b[idx] = i - j

    # Multiply
    for i in range(size):
        for j in range(size):
            sum_val = 0
            for k in range(size):
                sum_val += a[i * size + k] * b[k * size + j]
            c[i * size + j] = sum_val

    # Verify
    result_sum = sum(c)

    print(f"Matrix {size}x{size} sum: {result_sum}")


if __name__ == "__main__":
    main()
