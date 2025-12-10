@.str.0 = private unnamed_addr constant [24 x i8] c"Fibonacci of 10 is: %d\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare void @printf(i8*, ...)

define i32 @fib(i32 %n) {
entry:
  %n_ptr = alloca i32
  store i32 %n, i32* %n_ptr
  %0 = load i32, i32* %n_ptr
  %1 = icmp sle i32 %0, 1
  br i1 %1, label %then.0, label %merge.2
then.0:
  %2 = load i32, i32* %n_ptr
  ret i32 %2
merge.2:
  %3 = load i32, i32* %n_ptr
  %4 = sub i32 %3, 1
  %6 = call i32 @fib(i32 %4)
  %7 = load i32, i32* %n_ptr
  %8 = sub i32 %7, 2
  %10 = call i32 @fib(i32 %8)
  %11 = add i32 %6, %10
  ret i32 %11
}

define i32 @main() {
entry:
  %result_ptr = alloca i32
  %1 = call i32 @fib(i32 10)
  store i32 %1, i32* %result_ptr
  %4 = load i32, i32* %result_ptr
  call void (i8*, ...) @printf(i8* getelementptr inbounds ([24 x i8], [24 x i8]* @.str.0, i64 0, i64 0), i32 %4)
  ret i32 0
}
