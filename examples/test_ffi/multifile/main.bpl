import printHello from "./lib.bpl";

extern printf(fmt: string, ...) ret int;

frame main() ret int {
    printHello();
    printf("Multi-file extern OK\n");
    return 0;
}
