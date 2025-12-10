import [exportedFunc] from "./module.bpl";
extern printf(fmt: string, ...) ret int;

frame main() ret int {
    local x: int = exportedFunc();

    printf("exportedFunc returned: %d\n", x);
    return 0;
}
