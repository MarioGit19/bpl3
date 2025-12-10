@.str.0 = private unnamed_addr constant [12 x i8] c"Global: %d\0A\00", align 1
@.str.1 = private unnamed_addr constant [21 x i8] c"Global Modified: %d\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare void @printf(i8*, ...)

@G = global i32 100

define i32 @main() {
entry:
  %1 = load i32, i32* @G
  call void (i8*, ...) @printf(i8* getelementptr inbounds ([12 x i8], [12 x i8]* @.str.0, i64 0, i64 0), i32 %1)
  store i32 200, i32* @G
  %4 = load i32, i32* @G
  call void (i8*, ...) @printf(i8* getelementptr inbounds ([21 x i8], [21 x i8]* @.str.1, i64 0, i64 0), i32 %4)
  ret i32 0
}
