def main():
    limit = 10000000
    size = limit + 1
    is_prime = [True] * size
    is_prime[0] = False
    is_prime[1] = False

    p = 2
    while p * p <= limit:
        if is_prime[p]:
            for j in range(p * p, limit + 1, p):
                is_prime[j] = False
        p += 1

    count = sum(1 for x in is_prime if x)
    print(f"Primes up to {limit}: {count}")


if __name__ == "__main__":
    main()
