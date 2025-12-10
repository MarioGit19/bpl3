@.str.0 = private unnamed_addr constant [12 x i8] c"Global: %d\0A\00", align 1
@.str.1 = private unnamed_addr constant [21 x i8] c"Global Modified: %d\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare void @printf(i8*, ...)

@G = global i64 100

define i64 @main() {
entry:
  %0 = load i64, i64* @G
  call void @printf(i8* getelementptr inbounds ([12 x i8], [12 x i8]* @.str.0, i64 0, i64 0), i64 %0)
  store i64 200, i64* @G
  %1 = load i64, i64* @G
  call void @printf(i8* getelementptr inbounds ([21 x i8], [21 x i8]* @.str.1, i64 0, i64 0), i64 %1)
  ret i64 0
}
