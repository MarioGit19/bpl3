#include <stdio.h>

int main() {
    long long i = 0;
    long long sum = 0;
    // Loop 100 million times
    for (i = 0; i < 100000000; i++) {
        sum++;
    }
    // Prevent optimization
    if (sum == 0) printf("Zero\n");
    return 0;
}
