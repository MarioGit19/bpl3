@.str.0 = private unnamed_addr constant [14 x i8] c"10 %% 3 = %d\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare void @printf(i8*, ...)

define i32 @main() {
entry:
  %1 = srem i32 10, 3
  call void (i8*, ...) @printf(i8* getelementptr inbounds ([14 x i8], [14 x i8]* @.str.0, i64 0, i64 0), i32 %1)
  ret i32 0
}
