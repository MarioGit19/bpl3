#include <stdio.h>
#include <stdlib.h>

int main() {
    int size = 300;
    int total_elements = size * size;
    
    // Using long long to match BPL's 64-bit int
    long long* a = (long long*)malloc(total_elements * sizeof(long long));
    long long* b = (long long*)malloc(total_elements * sizeof(long long));
    long long* c = (long long*)malloc(total_elements * sizeof(long long));
    
    // Initialize
    for (int i = 0; i < size; i++) {
        for (int j = 0; j < size; j++) {
            int idx = i * size + j;
            a[idx] = i + j;
            b[idx] = i - j;
        }
    }
    
    // Multiply
    for (int i = 0; i < size; i++) {
        for (int j = 0; j < size; j++) {
            long long sum = 0;
            for (int k = 0; k < size; k++) {
                sum += a[i * size + k] * b[k * size + j];
            }
            c[i * size + j] = sum;
        }
    }
    
    // Verify
    long long result_sum = 0;
    for (int i = 0; i < total_elements; i++) {
        result_sum += c[i];
    }
    
    printf("Matrix %dx%d sum: %lld\n", size, size, result_sum);
    
    free(a);
    free(b);
    free(c);
    
    return 0;
}
