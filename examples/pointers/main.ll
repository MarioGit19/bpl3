@.str.0 = private unnamed_addr constant [11 x i8] c"Value: %d\0A\00", align 1
@.str.1 = private unnamed_addr constant [15 x i8] c"New Value: %d\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare void @printf(i8*, ...)

define i32 @main() {
entry:
  %x_ptr = alloca i32
  store i32 42, i32* %x_ptr
  %ptr_ptr = alloca i32*
  store i32* %x_ptr, i32** %ptr_ptr
  %3 = load i32*, i32** %ptr_ptr
  %4 = load i32, i32* %3
  call void (i8*, ...) @printf(i8* getelementptr inbounds ([11 x i8], [11 x i8]* @.str.0, i64 0, i64 0), i32 %4)
  %5 = load i32*, i32** %ptr_ptr
  store i32 100, i32* %5
  %8 = load i32, i32* %x_ptr
  call void (i8*, ...) @printf(i8* getelementptr inbounds ([15 x i8], [15 x i8]* @.str.1, i64 0, i64 0), i32 %8)
  ret i32 0
}
