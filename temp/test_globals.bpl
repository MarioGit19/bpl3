extern printf(fmt: string, ...) ret int;

global g_x: int = 100;

frame main() ret int {
    printf("g_x = %d\n", g_x);
    g_x = 200;
    printf("g_x = %d\n", g_x);
    
    local l_x: int = 50;
    printf("l_x = %d\n", l_x);
    
    return 0;
}
