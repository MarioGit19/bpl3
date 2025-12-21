import {EXPORTED_CONST}, {exported_var}, get_exported_const, [Point] from "./exporter.bpl";

extern printf(fmt: *i8, ...) ret i32;
extern exit(code: i32);

frame main() {
    if (EXPORTED_CONST != 42) {
        printf("EXPORTED_CONST mismatch: %d\n", EXPORTED_CONST);
        exit(1);
    }
    if (exported_var != 99) {
        printf("exported_var mismatch: %d\n", exported_var);
        exit(1);
    }
    if (get_exported_const() != 42) {
        printf("get_exported_const() mismatch\n");
        exit(1);
    }
    local p: Point = Point { x: 10, y: 20 };
    if (p.x != 10) {
        printf("Point struct mismatch\n");
        exit(1);
    }
    printf("Import/Export test passed\n");
}
