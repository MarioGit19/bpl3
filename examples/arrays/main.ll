@.str.0 = private unnamed_addr constant [4 x i8] c"%d \00", align 1
@.str.1 = private unnamed_addr constant [2 x i8] c"\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare void @printf(i8*, ...)

define i32 @main() {
entry:
  %arr_ptr = alloca [5 x i32]
  %0 = sext i32 0 to i64
  %1 = getelementptr inbounds [5 x i32], [5 x i32]* %arr_ptr, i64 0, i64 %0
  store i32 10, i32* %1
  %3 = sext i32 1 to i64
  %4 = getelementptr inbounds [5 x i32], [5 x i32]* %arr_ptr, i64 0, i64 %3
  store i32 20, i32* %4
  %6 = sext i32 2 to i64
  %7 = getelementptr inbounds [5 x i32], [5 x i32]* %arr_ptr, i64 0, i64 %6
  store i32 30, i32* %7
  %9 = sext i32 3 to i64
  %10 = getelementptr inbounds [5 x i32], [5 x i32]* %arr_ptr, i64 0, i64 %9
  store i32 40, i32* %10
  %12 = sext i32 4 to i64
  %13 = getelementptr inbounds [5 x i32], [5 x i32]* %arr_ptr, i64 0, i64 %12
  store i32 50, i32* %13
  %i_ptr = alloca i32
  store i32 0, i32* %i_ptr
  br label %cond.0
cond.0:
  %16 = load i32, i32* %i_ptr
  %17 = icmp slt i32 %16, 5
  br i1 %17, label %body.1, label %end.2
body.1:
  %19 = load i32, i32* %i_ptr
  %20 = sext i32 %19 to i64
  %21 = getelementptr inbounds [5 x i32], [5 x i32]* %arr_ptr, i64 0, i64 %20
  %22 = load i32, i32* %21
  call void (i8*, ...) @printf(i8* getelementptr inbounds ([4 x i8], [4 x i8]* @.str.0, i64 0, i64 0), i32 %22)
  %23 = load i32, i32* %i_ptr
  %24 = add i32 %23, 1
  store i32 %24, i32* %i_ptr
  br label %cond.0
end.2:
  call void (i8*, ...) @printf(i8* getelementptr inbounds ([2 x i8], [2 x i8]* @.str.1, i64 0, i64 0))
  ret i32 0
}
