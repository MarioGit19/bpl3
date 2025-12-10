@.str.0 = private unnamed_addr constant [5 x i8] c"One\0A\00", align 1
@.str.1 = private unnamed_addr constant [5 x i8] c"Two\0A\00", align 1
@.str.2 = private unnamed_addr constant [7 x i8] c"Other\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare void @printf(i8*, ...)

define i32 @main() {
entry:
  %i_ptr = alloca i32
  store i32 2, i32* %i_ptr
  %1 = load i32, i32* %i_ptr
  switch i32 %1, label %switch.default.1 [
    i32 1, label %switch.case.2
    i32 2, label %switch.case.3
  ]
switch.case.2:
  call void (i8*, ...) @printf(i8* getelementptr inbounds ([5 x i8], [5 x i8]* @.str.0, i64 0, i64 0))
  br label %switch.end.0
switch.case.3:
  call void (i8*, ...) @printf(i8* getelementptr inbounds ([5 x i8], [5 x i8]* @.str.1, i64 0, i64 0))
  br label %switch.end.0
switch.default.1:
  call void (i8*, ...) @printf(i8* getelementptr inbounds ([7 x i8], [7 x i8]* @.str.2, i64 0, i64 0))
  br label %switch.end.0
switch.end.0:
  ret i32 0
}
