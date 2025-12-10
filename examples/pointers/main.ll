@.str.0 = private unnamed_addr constant [11 x i8] c"Value: %d\0A\00", align 1
@.str.1 = private unnamed_addr constant [15 x i8] c"New Value: %d\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare void @printf(i8*, ...)

define i64 @main() {
entry:
  %x_ptr = alloca i64
  store i64 42, i64* %x_ptr
  %ptr_ptr = alloca i64*
  store i64* %x_ptr, i64** %ptr_ptr
  %0 = load i64*, i64** %ptr_ptr
  %1 = load i64, i64* %0
  call void @printf(i8* getelementptr inbounds ([11 x i8], [11 x i8]* @.str.0, i64 0, i64 0), i64 %1)
  %2 = load i64*, i64** %ptr_ptr
  store i64 100, i64* %2
  %3 = load i64, i64* %x_ptr
  call void @printf(i8* getelementptr inbounds ([15 x i8], [15 x i8]* @.str.1, i64 0, i64 0), i64 %3)
  ret i64 0
}
