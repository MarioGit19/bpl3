def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)


def main():
    n = 40
    result = fib(n)
    print(f"Fib({n}) = {result}")


if __name__ == "__main__":
    main()
