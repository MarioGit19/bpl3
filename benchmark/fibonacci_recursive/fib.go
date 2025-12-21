package main

import "fmt"

func fib(n int64) int64 {
	if n < 2 {
		return n
	}
	return fib(n-1) + fib(n-2)
}

func main() {
	var n int64 = 40
	result := fib(n)
	fmt.Printf("Fib(%d) = %d\n", n, result)

}
