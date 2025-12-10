@.str.0 = private unnamed_addr constant [19 x i8] c"Int: %d, Char: %c\0A\00", align 1
@.str.1 = private unnamed_addr constant [20 x i8] c"Float: %f, Int: %d\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare void @printf(i8*, ...)

define i32 @main() {
entry:
  %i_ptr = alloca i32
  store i32 65, i32* %i_ptr
  %c_ptr = alloca i8
  %1 = load i32, i32* %i_ptr
  %2 = trunc i32 %1 to i8
  store i8 %2, i8* %c_ptr
  %5 = load i32, i32* %i_ptr
  %6 = load i8, i8* %c_ptr
  call void (i8*, ...) @printf(i8* getelementptr inbounds ([19 x i8], [19 x i8]* @.str.0, i64 0, i64 0), i32 %5, i8 %6)
  %f_ptr = alloca double
  store double 3.14, double* %f_ptr
  %fi_ptr = alloca i32
  %8 = load double, double* %f_ptr
  %9 = fptosi double %8 to i32
  store i32 %9, i32* %fi_ptr
  %12 = load double, double* %f_ptr
  %13 = load i32, i32* %fi_ptr
  call void (i8*, ...) @printf(i8* getelementptr inbounds ([20 x i8], [20 x i8]* @.str.1, i64 0, i64 0), double %12, i32 %13)
  ret i32 0
}
