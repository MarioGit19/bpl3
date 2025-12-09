@.str.0 = private unnamed_addr constant [8 x i8] c"x = %d\0A\00", align 1
@.str.1 = private unnamed_addr constant [11 x i8] c"*ptr = %d\0A\00", align 1
@.str.2 = private unnamed_addr constant [21 x i8] c"x after *ptr=20: %d\0A\00", align 1
@.str.3 = private unnamed_addr constant [11 x i8] c"*dyn = %d\0A\00", align 1
@.str.4 = private unnamed_addr constant [26 x i8] c"arr[0] = %d, arr[1] = %d\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare i64 @printf(i8*, ...)

define i64 @main() {
entry:
  %x_ptr = alloca i64
  store i64 10, i64* %x_ptr
  %ptr_ptr = alloca i64*
  store i64* %x_ptr, i64** %ptr_ptr
  %0 = load i64, i64* %x_ptr
  %1 = call i64 @printf(i8* getelementptr inbounds ([8 x i8], [8 x i8]* @.str.0, i64 0, i64 0), i64 %0)
  %2 = load i64*, i64** %ptr_ptr
  %3 = load i64, i64* %2
  %4 = call i64 @printf(i8* getelementptr inbounds ([11 x i8], [11 x i8]* @.str.1, i64 0, i64 0), i64 %3)
  %5 = load i64*, i64** %ptr_ptr
  store i64 20, i64* %5
  %6 = load i64, i64* %x_ptr
  %7 = call i64 @printf(i8* getelementptr inbounds ([21 x i8], [21 x i8]* @.str.2, i64 0, i64 0), i64 %6)
  %dyn_ptr = alloca i64*
  %8 = call i8* @malloc(i64 8)
  %9 = bitcast i8* %8 to i64*
  store i64* %9, i64** %dyn_ptr
  %10 = load i64*, i64** %dyn_ptr
  store i64 123, i64* %10
  %11 = load i64*, i64** %dyn_ptr
  %12 = load i64, i64* %11
  %13 = call i64 @printf(i8* getelementptr inbounds ([11 x i8], [11 x i8]* @.str.3, i64 0, i64 0), i64 %12)
  %arr_ptr = alloca i64*
  %14 = call i8* @malloc(i64 16)
  %15 = bitcast i8* %14 to i64*
  store i64* %15, i64** %arr_ptr
  %16 = load i64*, i64** %arr_ptr
  store i64 1, i64* %16
  %17 = load i64*, i64** %arr_ptr
  %18 = getelementptr inbounds i64, i64* %17, i64 1
  store i64 2, i64* %18
  %19 = load i64*, i64** %arr_ptr
  %20 = load i64, i64* %19
  %21 = load i64*, i64** %arr_ptr
  %22 = getelementptr inbounds i64, i64* %21, i64 1
  %23 = load i64, i64* %22
  %24 = call i64 @printf(i8* getelementptr inbounds ([26 x i8], [26 x i8]* @.str.4, i64 0, i64 0), i64 %20, i64 %23)
  ret i64 0
}
