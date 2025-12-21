def main():
    sum = 0
    # Loop 100 million times
    for i in range(100000000):
        sum += 1

    # Prevent optimization
    if sum == 0:
        print("Sum is zero")

    return sum


if __name__ == "__main__":
    main()
