extern printf(fmt: string, ...) ret int;
extern strlen(s: string) ret ulong;

frame customStrlen(s: string) ret ulong {
    return strlen(s);
}

frame main() ret int {
    printf("Mixed functions OK\n");
    return 0;
}
