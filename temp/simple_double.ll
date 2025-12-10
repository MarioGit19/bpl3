@.str = private unnamed_addr constant [11 x i8] c"Value: %f\0A\00", align 1

declare i32 @printf(i8*, ...)

define i32 @main() {
  %d_ptr = alloca double
  store double 10.5, double* %d_ptr
  %d = load double, double* %d_ptr
  call i32 (i8*, ...) @printf(i8* getelementptr inbounds ([11 x i8], [11 x i8]* @.str, i64 0, i64 0), double %d)
  ret i32 0
}
