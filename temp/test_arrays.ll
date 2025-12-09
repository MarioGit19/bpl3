@.str.0 = private unnamed_addr constant [14 x i8] c"arr[%d] = %d\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare i64 @printf(i8*, ...)

define i64 @main() {
entry:
  %arr_ptr = alloca [5 x i64]
  %i_ptr = alloca i64
  store i64 0, i64* %i_ptr
  br label %cond.0
cond.0:
  %0 = load i64, i64* %i_ptr
  %1 = icmp slt i64 %0, 5
  br i1 %1, label %body.1, label %end.2
body.1:
  %2 = load i64, i64* %i_ptr
  %3 = getelementptr inbounds [5 x i64], [5 x i64]* %arr_ptr, i64 0, i64 %2
  %4 = load i64, i64* %i_ptr
  %5 = mul i64 %4, 10
  store i64 %5, i64* %3
  %6 = load i64, i64* %i_ptr
  %7 = add i64 %6, 1
  store i64 %7, i64* %i_ptr
  br label %cond.0
end.2:
  store i64 0, i64* %i_ptr
  br label %cond.3
cond.3:
  %8 = load i64, i64* %i_ptr
  %9 = icmp slt i64 %8, 5
  br i1 %9, label %body.4, label %end.5
body.4:
  %10 = load i64, i64* %i_ptr
  %11 = load i64, i64* %i_ptr
  %12 = getelementptr inbounds [5 x i64], [5 x i64]* %arr_ptr, i64 0, i64 %11
  %13 = load i64, i64* %12
  %14 = call i64 @printf(i8* getelementptr inbounds ([14 x i8], [14 x i8]* @.str.0, i64 0, i64 0), i64 %10, i64 %13)
  %15 = load i64, i64* %i_ptr
  %16 = add i64 %15, 1
  store i64 %16, i64* %i_ptr
  br label %cond.3
end.5:
  ret i64 0
}
