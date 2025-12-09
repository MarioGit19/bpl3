@.str.0 = private unnamed_addr constant [10 x i8] c"g_x = %d\0A\00", align 1
@.str.1 = private unnamed_addr constant [10 x i8] c"l_x = %d\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare i64 @printf(i8*, ...)

@g_x = global i64 100

define i64 @main() {
entry:
  %0 = load i64, i64* @g_x
  %1 = call i64 @printf(i8* getelementptr inbounds ([10 x i8], [10 x i8]* @.str.0, i64 0, i64 0), i64 %0)
  store i64 200, i64* @g_x
  %2 = load i64, i64* @g_x
  %3 = call i64 @printf(i8* getelementptr inbounds ([10 x i8], [10 x i8]* @.str.0, i64 0, i64 0), i64 %2)
  %l_x_ptr = alloca i64
  store i64 50, i64* %l_x_ptr
  %4 = load i64, i64* %l_x_ptr
  %5 = call i64 @printf(i8* getelementptr inbounds ([10 x i8], [10 x i8]* @.str.1, i64 0, i64 0), i64 %4)
  ret i64 0
}
