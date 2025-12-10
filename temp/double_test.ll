@.str.0 = private unnamed_addr constant [11 x i8] c"Val: %.2f\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare i32 @printf(i8*, ...)

define i32 @main() {
entry:
  %x_ptr = alloca double
  store double 10.5, double* %x_ptr
  %2 = load double, double* %x_ptr
  %3 = call i32 (i8*, ...) @printf(i8* getelementptr inbounds ([11 x i8], [11 x i8]* @.str.0, i64 0, i64 0), double %2)
  ret i32 0
}
