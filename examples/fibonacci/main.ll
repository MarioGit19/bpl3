@.str.0 = private unnamed_addr constant [24 x i8] c"Fibonacci of 10 is: %d\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare void @printf(i8*, ...)

define i64 @fib(i64 %n) {
entry:
  %n_ptr = alloca i64
  store i64 %n, i64* %n_ptr
  %0 = load i64, i64* %n_ptr
  %1 = icmp sle i64 %0, 1
  br i1 %1, label %then.0, label %merge.2
then.0:
  %2 = load i64, i64* %n_ptr
  ret i64 %2
merge.2:
  %3 = load i64, i64* %n_ptr
  %4 = sub i64 %3, 1
  %5 = call i64 @fib(i64 %4)
  %6 = load i64, i64* %n_ptr
  %7 = sub i64 %6, 2
  %8 = call i64 @fib(i64 %7)
  %9 = add i64 %5, %8
  ret i64 %9
}

define i64 @main() {
entry:
  %result_ptr = alloca i64
  %0 = call i64 @fib(i64 10)
  store i64 %0, i64* %result_ptr
  %1 = load i64, i64* %result_ptr
  call void @printf(i8* getelementptr inbounds ([24 x i8], [24 x i8]* @.str.0, i64 0, i64 0), i64 %1)
  ret i64 0
}
