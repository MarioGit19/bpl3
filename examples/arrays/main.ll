@.str.0 = private unnamed_addr constant [4 x i8] c"%d \00", align 1
@.str.1 = private unnamed_addr constant [2 x i8] c"\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare void @printf(i8*, ...)

define i64 @main() {
entry:
  %arr_ptr = alloca [5 x i64]
  %0 = getelementptr inbounds [5 x i64], [5 x i64]* %arr_ptr, i64 0, i64 0
  store i64 10, i64* %0
  %1 = getelementptr inbounds [5 x i64], [5 x i64]* %arr_ptr, i64 0, i64 1
  store i64 20, i64* %1
  %2 = getelementptr inbounds [5 x i64], [5 x i64]* %arr_ptr, i64 0, i64 2
  store i64 30, i64* %2
  %3 = getelementptr inbounds [5 x i64], [5 x i64]* %arr_ptr, i64 0, i64 3
  store i64 40, i64* %3
  %4 = getelementptr inbounds [5 x i64], [5 x i64]* %arr_ptr, i64 0, i64 4
  store i64 50, i64* %4
  %i_ptr = alloca i64
  store i64 0, i64* %i_ptr
  br label %cond.0
cond.0:
  %5 = load i64, i64* %i_ptr
  %6 = icmp slt i64 %5, 5
  br i1 %6, label %body.1, label %end.2
body.1:
  %7 = load i64, i64* %i_ptr
  %8 = getelementptr inbounds [5 x i64], [5 x i64]* %arr_ptr, i64 0, i64 %7
  %9 = load i64, i64* %8
  call void @printf(i8* getelementptr inbounds ([4 x i8], [4 x i8]* @.str.0, i64 0, i64 0), i64 %9)
  %10 = load i64, i64* %i_ptr
  %11 = add i64 %10, 1
  store i64 %11, i64* %i_ptr
  br label %cond.0
end.2:
  call void @printf(i8* getelementptr inbounds ([2 x i8], [2 x i8]* @.str.1, i64 0, i64 0))
  ret i64 0
}
