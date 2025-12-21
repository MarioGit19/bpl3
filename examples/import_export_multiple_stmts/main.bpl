import {exported_var}, {EXPORTED_CONST} from "./exporter.bpl";
import get_exported_const from "./exporter.bpl";

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
    # Modify imported var (should be allowed if not const)
    exported_var = 100;
    if (exported_var != 100) {
        printf("exported_var modification failed\n");
        exit(1);
    }
    # Modify imported const (should fail compilation)
    # EXPORTED_CONST = 43;

    printf("Import test passed\n");
}
