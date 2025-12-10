@.str = private unnamed_addr constant [18 x i8] c"Val: %d %f %f %f\0A\00", align 1

declare i32 @printf(i8*, ...)

define i32 @main() {
  %d_ptr = alloca double
  store double 10.5, double* %d_ptr
  %d = load double, double* %d_ptr
  %ret = call i32 (i8*, ...) @printf(i8* getelementptr inbounds ([18 x i8], [18 x i8]* @.str, i64 0, i64 0), i32 42, double %d, double %d, double %d)
  ret i32 0
}
