package main

import "fmt"

func main() {
	size := 300
	totalElements := size * size

	a := make([]int64, totalElements)
	b := make([]int64, totalElements)
	c := make([]int64, totalElements)

	// Initialize
	for i := 0; i < size; i++ {
		for j := 0; j < size; j++ {
			idx := i*size + j
			a[idx] = int64(i + j)
			b[idx] = int64(i - j)
		}
	}

	// Multiply
	for i := 0; i < size; i++ {
		for j := 0; j < size; j++ {
			var sum int64 = 0
			for k := 0; k < size; k++ {
				sum += a[i*size+k] * b[k*size+j]
			}
			c[i*size+j] = sum
		}
	}

	// Verify
	var resultSum int64 = 0
	for i := 0; i < totalElements; i++ {
		resultSum += c[i]
	}

	fmt.Printf("Matrix %dx%d sum: %d\n", size, size, resultSum)
}
