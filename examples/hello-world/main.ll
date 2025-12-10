@.str.0 = private unnamed_addr constant [15 x i8] c"Hello, World!\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare void @printf(i8*, ...)

define i32 @main() {
entry:
  call void (i8*, ...) @printf(i8* getelementptr inbounds ([15 x i8], [15 x i8]* @.str.0, i64 0, i64 0))
  ret i32 0
}
