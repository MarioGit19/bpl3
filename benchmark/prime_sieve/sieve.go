package main

import "fmt"

func main() {
	limit := 10000000
	size := limit + 1
	isPrime := make([]bool, size)

	for i := 0; i < size; i++ {
		isPrime[i] = true
	}

	isPrime[0] = false
	isPrime[1] = false

	for p := 2; p*p <= limit; p++ {
		if isPrime[p] {
			for j := p * p; j <= limit; j += p {
				isPrime[j] = false
			}
		}
	}

	count := 0
	for i := 0; i <= limit; i++ {
		if isPrime[i] {
			count++
		}
	}

	fmt.Printf("Primes up to %d: %d\n", limit, count)
}
