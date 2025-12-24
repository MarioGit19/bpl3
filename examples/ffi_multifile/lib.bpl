extern printf(fmt: string, ...) ret int;

frame printHello() {
    printf("Hello from lib\n");
}

export printHello;
