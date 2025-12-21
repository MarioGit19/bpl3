package main

import "fmt"

func main() {
	sum := 0
	// Loop 100 million times
	for i := 0; i < 100000000; i++ {
		sum++
	}
	// Prevent optimization
	if sum == 0 {
		fmt.Println("Zero")
	}
}
