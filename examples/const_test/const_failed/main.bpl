global const GLOBAL_CONST: i32 = 100;
global var_global: i32 = 200;

extern printf(fmt: *i8, ...) ret i32;
extern exit(code: i32);

frame main() {
  local const LOCAL_CONST: i32 = 10;
  local var_local: i32 = 20;

  # Read constants
  if (GLOBAL_CONST != 100) {
    printf("GLOBAL_CONST mismatch\n");
    exit(1);
  }

  if (LOCAL_CONST != 10) {
    printf("LOCAL_CONST mismatch\n");
    exit(1);
  }

  # Assignments (should fail compilation if uncommented)
  GLOBAL_CONST = 101;
  LOCAL_CONST = 11;

  printf("Const test passed\n");
}
