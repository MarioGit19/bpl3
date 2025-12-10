@.str.0 = private unnamed_addr constant [19 x i8] c"Int: %d, Char: %c\0A\00", align 1
@.str.1 = private unnamed_addr constant [20 x i8] c"Float: %f, Int: %d\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare void @printf(i8*, ...)

define i64 @main() {
entry:
  %i_ptr = alloca i64
  store i64 65, i64* %i_ptr
  %c_ptr = alloca i8
  %0 = load i64, i64* %i_ptr
  %1 = trunc i64 %0 to i8
  store i8 %1, i8* %c_ptr
  %2 = load i64, i64* %i_ptr
  %3 = load i8, i8* %c_ptr
  call void @printf(i8* getelementptr inbounds ([19 x i8], [19 x i8]* @.str.0, i64 0, i64 0), i64 %2, i8 %3)
  %f_ptr = alloca double
  store double 3.14, double* %f_ptr
  %fi_ptr = alloca i64
  %4 = load double, double* %f_ptr
  %5 = fptosi double %4 to i64
  store i64 %5, i64* %fi_ptr
  %6 = load double, double* %f_ptr
  %7 = load i64, i64* %fi_ptr
  call void @printf(i8* getelementptr inbounds ([20 x i8], [20 x i8]* @.str.1, i64 0, i64 0), double %6, i64 %7)
  ret i64 0
}
