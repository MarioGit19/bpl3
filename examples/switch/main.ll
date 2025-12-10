@.str.0 = private unnamed_addr constant [5 x i8] c"One\0A\00", align 1
@.str.1 = private unnamed_addr constant [5 x i8] c"Two\0A\00", align 1
@.str.2 = private unnamed_addr constant [7 x i8] c"Other\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare void @printf(i8*, ...)

define i64 @main() {
entry:
  %i_ptr = alloca i64
  store i64 2, i64* %i_ptr
  %0 = load i64, i64* %i_ptr
  switch i64 %0, label %switch.default.1 [
    i64 1, label %switch.case.2
    i64 2, label %switch.case.3
  ]
switch.case.2:
  call void @printf(i8* getelementptr inbounds ([5 x i8], [5 x i8]* @.str.0, i64 0, i64 0))
  br label %switch.end.0
switch.case.3:
  call void @printf(i8* getelementptr inbounds ([5 x i8], [5 x i8]* @.str.1, i64 0, i64 0))
  br label %switch.end.0
switch.default.1:
  call void @printf(i8* getelementptr inbounds ([7 x i8], [7 x i8]* @.str.2, i64 0, i64 0))
  br label %switch.end.0
switch.end.0:
  ret i64 0
}
